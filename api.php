<?php
// Suppression des warnings PHP pour éviter HTML dans les réponses JSON

ini_set('display_errors', 1);
error_reporting(E_ALL);

@error_reporting(0);
@ini_set('display_errors', 0);
@ini_set('upload_max_filesize', '10M');
@ini_set('post_max_size', '12M');
ob_start();

/**
 * API Audit PICO BTS — Sogetrel
 * Hébergement OVH — c-it.fr
 *
 * Tables :
 *   profiles       — comptes techniciens
 *   app_config     — configuration applicative
 *   rapports       — entête rapport (référence = numero_ot)
 *   rapport_garde  — page de garde (client, site, technicien…)
 *   rapport_mesures— mesures PM (4G/5G/speedtest par point de mesure)
 *   rapport_pico   — équipements PICO (1 ligne par PICO installé)
 *   rapport_oeuvre — mise en œuvre (matériel, personnel, fournitures)
 *   rapport_acces  — accès site
 *   rapport_doe    — données DOE + reste à faire
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . (getenv('APP_CORS_ORIGIN') ?: '*'));
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Api-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

// ── Config DB ─────────────────────────────────────────────────────────────────
define('DB_HOST', getenv('APP_DB_HOST') ?: 'citfrjgtov050671.mysql.db');
define('DB_NAME', getenv('APP_DB_NAME') ?: 'citfrjgtov050671');
define('DB_USER', getenv('APP_DB_USER') ?: 'citfrjgtov050671');
define('DB_PASS', getenv('APP_DB_PASS') ?: 'Omar05061971');
define('API_KEY', getenv('APP_API_KEY') ?: sha1('SogetrelAuditPICO2025'));

// ── Connexion PDO ─────────────────────────────────────────────────────────────
function getDB() {
    static $pdo = null;
    if ($pdo) return $pdo;
    try {
        $pdo = new PDO(
            'mysql:host='.DB_HOST.';dbname='.DB_NAME.';charset=utf8mb4',
            DB_USER, DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
             PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
        return $pdo;
    } catch (Exception $e) { jsonError('DB: '.$e->getMessage(), 500); }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function jsonOut($d)  { echo json_encode($d, JSON_UNESCAPED_UNICODE); exit; }
function jsonOk($data=[]) { ob_clean(); header('Content-Type: application/json'); echo json_encode(['ok'=>true,'data'=>$data]); exit; }
function jsonError($m, $c=400) { ob_clean(); http_response_code($c); header('Content-Type: application/json'); echo json_encode(['ok'=>false,'error'=>$m]); exit; }
function getBody() {
    $d = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) jsonError('JSON invalide');
    return $d;
}
function checkAuth() {
    $k = $_GET['k'] ?? ($_SERVER['HTTP_X_API_KEY'] ?? '');
    if (!$k || !hash_equals((string)API_KEY, (string)$k)) jsonError('Non autorisé', 401);
}
function s($v) { return ($v === null || $v === '') ? null : (string)$v; }
function n($v) { return ($v === null || $v === '') ? null : (float)$v; }
function b($v) { return $v ? 1 : 0; }

// ── Initialisation des tables ──────────────────────────────────────────────────
function initDB() {
    $db = getDB();

    // Profils techniciens (existant)
    $db->exec("CREATE TABLE IF NOT EXISTS profiles (
        id          VARCHAR(64)  PRIMARY KEY,
        data        LONGTEXT     NOT NULL,
        updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Config app (existant)
    $db->exec("CREATE TABLE IF NOT EXISTS app_config (
        key_name    VARCHAR(64)  PRIMARY KEY,
        value       TEXT,
        updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // ── Table centrale rapports ───────────────────────────────────────────────
    // numero_ot est la clé de référence entre tous les rapports d'un même chantier
    $db->exec("CREATE TABLE IF NOT EXISTS rapports (
        id              VARCHAR(64)  PRIMARY KEY,       -- id interne app (audit_XXXXX)
        numero_ot       VARCHAR(64)  NOT NULL,          -- N° OT = référence croisée
        doc_type        VARCHAR(32)  NOT NULL DEFAULT 'audit', -- audit | doe | …
        statut          VARCHAR(32)  DEFAULT 'En cours',
        technicien_id   VARCHAR(64)  DEFAULT NULL,
        created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ot    (numero_ot),
        INDEX idx_type  (doc_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // ── Page de garde ─────────────────────────────────────────────────────────
    $db->exec("CREATE TABLE IF NOT EXISTS rapport_garde (
        numero_ot       VARCHAR(64)  PRIMARY KEY,
        doc_type        VARCHAR(32)  NOT NULL DEFAULT 'audit',
        raison_sociale  VARCHAR(256) DEFAULT NULL,
        adresse         VARCHAR(512) DEFAULT NULL,
        contact         VARCHAR(128) DEFAULT NULL,
        telephone       VARCHAR(32)  DEFAULT NULL,
        email           VARCHAR(128) DEFAULT NULL,
        cdp             VARCHAR(128) DEFAULT NULL,
        technicien      VARCHAR(128) DEFAULT NULL,
        date_rapport    VARCHAR(32)  DEFAULT NULL,
        updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // ── Mesures PM (4G / 5G / Speedtest) ─────────────────────────────────────
    // 1 ligne par point de mesure PM par rapport
    $db->exec("CREATE TABLE IF NOT EXISTS rapport_mesures (
        id              INT          AUTO_INCREMENT PRIMARY KEY,
        numero_ot       VARCHAR(64)  NOT NULL,
        doc_type        VARCHAR(32)  NOT NULL DEFAULT 'audit',
        label_pm        VARCHAR(32)  NOT NULL,          -- PM01, PM02…
        rsrp_4g         VARCHAR(32)  DEFAULT NULL,
        rsrq_4g         VARCHAR(32)  DEFAULT NULL,
        rssnr_4g        VARCHAR(32)  DEFAULT NULL,
        bande_4g        VARCHAR(32)  DEFAULT NULL,
        operateur_4g    VARCHAR(64)  DEFAULT NULL,
        rsrp_5g         VARCHAR(32)  DEFAULT NULL,
        rsrq_5g         VARCHAR(32)  DEFAULT NULL,
        bande_5g        VARCHAR(32)  DEFAULT NULL,
        operateur_5g    VARCHAR(64)  DEFAULT NULL,
        debit_dl        VARCHAR(32)  DEFAULT NULL,
        debit_ul        VARCHAR(32)  DEFAULT NULL,
        ping            VARCHAR(32)  DEFAULT NULL,
        notes           TEXT         DEFAULT NULL,
        lcid            VARCHAR(50)  DEFAULT NULL,
        enodeb          VARCHAR(50)  DEFAULT NULL,
        updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_ot_pm (numero_ot, doc_type, label_pm),
        INDEX idx_ot    (numero_ot)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // ── Équipements PICO ──────────────────────────────────────────────────────
    // 1 ligne par antenne PICO par rapport
    $db->exec("CREATE TABLE IF NOT EXISTS rapport_pico (
        id              INT          AUTO_INCREMENT PRIMARY KEY,
        numero_ot       VARCHAR(64)  NOT NULL,
        doc_type        VARCHAR(32)  NOT NULL DEFAULT 'audit',
        label_pico      VARCHAR(32)  NOT NULL,          -- PICO1, PICO2…
        hauteur         VARCHAR(32)  DEFAULT NULL,
        cablage         VARCHAR(128) DEFAULT NULL,
        longueur_cable  VARCHAR(32)  DEFAULT NULL,
        fixation        VARCHAR(128) DEFAULT NULL,
        alimentation    VARCHAR(64)  DEFAULT NULL,
        notes           TEXT         DEFAULT NULL,
        updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_ot_pico (numero_ot, doc_type, label_pico),
        INDEX idx_ot    (numero_ot)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // ── Mise en œuvre ─────────────────────────────────────────────────────────
    $db->exec("CREATE TABLE IF NOT EXISTS rapport_oeuvre (
        numero_ot           VARCHAR(64)  PRIMARY KEY,
        doc_type            VARCHAR(32)  NOT NULL DEFAULT 'audit',
        nb_techniciens      TINYINT      DEFAULT NULL,
        nb_jours            TINYINT      DEFAULT NULL,
        niveau_qualif       VARCHAR(16)  DEFAULT NULL,
        hauteur_travail_max VARCHAR(32)  DEFAULT NULL,
        nacelle             TINYINT(1)   DEFAULT 0,
        nacelle_hauteur     VARCHAR(32)  DEFAULT NULL,
        pirl                TINYINT(1)   DEFAULT 0,
        echafaudage         TINYINT(1)   DEFAULT 0,
        escabeau            TINYINT(1)   DEFAULT 0,
        escabeau_hauteur    VARCHAR(32)  DEFAULT NULL,
        epi                 TINYINT(1)   DEFAULT 0,
        perforateur         TINYINT(1)   DEFAULT 0,
        visseuse            TINYINT(1)   DEFAULT 0,
        chemin_cable        TINYINT(1)   DEFAULT 0,
        bandeau_prises      TINYINT(1)   DEFAULT 0,
        fournitures_auto    TINYINT(1)   DEFAULT 1,
        fournitures_extras  TEXT         DEFAULT NULL,
        poe                 TINYINT(1)   DEFAULT 1,
        chevilles           TINYINT(1)   DEFAULT 1,
        colliers            TINYINT(1)   DEFAULT 1,
        goulotte            TINYINT(1)   DEFAULT 0,
        piece_fixation      TINYINT(1)   DEFAULT 1,
        vlan                VARCHAR(16)  DEFAULT 'NON',
        vlan_port           VARCHAR(32)  DEFAULT NULL,
        valide_par          VARCHAR(128) DEFAULT NULL,
        marge_percent       TINYINT      DEFAULT 10,
        notes               TEXT         DEFAULT NULL,
        updated_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // ── Accès site ────────────────────────────────────────────────────────────
    $db->exec("CREATE TABLE IF NOT EXISTS rapport_plans (
        id              INT          AUTO_INCREMENT PRIMARY KEY,
        numero_ot       VARCHAR(64)  NOT NULL,
        plan_idx        TINYINT      NOT NULL DEFAULT 0,   -- 0=RDC, 1=R+1...
        plan_label      VARCHAR(64)  DEFAULT 'RDC',
        plan_photo      LONGTEXT     DEFAULT NULL,          -- base64 JPEG/PNG
        markers_json    LONGTEXT     DEFAULT NULL,          -- JSON [{id,type,label,x,y}]
        updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_ot_plan (numero_ot, plan_idx),
        INDEX idx_ot    (numero_ot)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // rapport_acces
    $db->exec("CREATE TABLE IF NOT EXISTS rapport_acces (
        numero_ot       VARCHAR(64)  PRIMARY KEY,
        doc_type        VARCHAR(32)  NOT NULL DEFAULT 'audit',
        notes           TEXT         DEFAULT NULL,
        updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // ── DOE — reste à faire ───────────────────────────────────────────────────
    $db->exec("CREATE TABLE IF NOT EXISTS rapport_doe (
        numero_ot               VARCHAR(64)  PRIMARY KEY,
        finalise                TINYINT(1)   DEFAULT 0,
        cablage_restant         TEXT         DEFAULT NULL,
        equipements_restants    TEXT         DEFAULT NULL,
        ressources              TEXT         DEFAULT NULL,
        besoins_client          TEXT         DEFAULT NULL,
        pico_non_installe       TEXT         DEFAULT NULL,  -- JSON array des labels
        notes                   TEXT         DEFAULT NULL,
        updated_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

// ── Sauvegarde structurée d'un rapport ────────────────────────────────────────
function saveRapportData($id, $docType, $data) {
    $db = getDB();
    $g   = $data['garde']   ?? [];
    $oe  = $data['oeuvre']  ?? [];
    $ac  = $data['acces']   ?? [];
    $doe = $data['doe']     ?? null;
    $pm  = $data['pmData']  ?? [];
    $pi  = $data['picoData']?? [];
    $ot  = trim($g['ot'] ?? '');

    if (!$ot) return; // pas de N° OT → rien à stocker dans les tables structurées

    // ── rapports (entête) ─────────────────────────────────────────────────────
    $db->prepare("INSERT INTO rapports (id, numero_ot, doc_type, statut)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE numero_ot=VALUES(numero_ot), doc_type=VALUES(doc_type),
            statut=VALUES(statut), updated_at=NOW()")
       ->execute([$id, $ot, $docType, $data['statut'] ?? 'En cours']);

    // ── rapport_garde ─────────────────────────────────────────────────────────
    $db->prepare("INSERT INTO rapport_garde
        (numero_ot, doc_type, raison_sociale, adresse, contact, telephone, email, cdp, technicien, date_rapport)
        VALUES (?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
            doc_type=VALUES(doc_type), raison_sociale=VALUES(raison_sociale),
            adresse=VALUES(adresse), contact=VALUES(contact),
            telephone=VALUES(telephone), email=VALUES(email),
            cdp=VALUES(cdp), technicien=VALUES(technicien),
            date_rapport=VALUES(date_rapport), updated_at=NOW()")
       ->execute([$ot, $docType,
            s($g['raisonSociale']), s($g['adresse']), s($g['contact']),
            s($g['telephone']),    s($g['email']),    s($g['cdp']),
            s($g['technicien']),   s($g['date'])]);

    // ── rapport_mesures (upsert par PM) ──────────────────────────────────────
    $stmtPM = $db->prepare("INSERT INTO rapport_mesures
        (numero_ot, doc_type, label_pm, rsrp_4g, rsrq_4g, rssnr_4g, bande_4g, operateur_4g,
         rsrp_5g, rsrq_5g, bande_5g, operateur_5g, debit_dl, debit_ul, ping, notes,
         lcid, enodeb)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
            rsrp_4g=VALUES(rsrp_4g), rsrq_4g=VALUES(rsrq_4g), rssnr_4g=VALUES(rssnr_4g),
            bande_4g=VALUES(bande_4g), operateur_4g=VALUES(operateur_4g),
            rsrp_5g=VALUES(rsrp_5g), rsrq_5g=VALUES(rsrq_5g),
            bande_5g=VALUES(bande_5g), operateur_5g=VALUES(operateur_5g),
            debit_dl=VALUES(debit_dl), debit_ul=VALUES(debit_ul), ping=VALUES(ping),
            notes=VALUES(notes), lcid=VALUES(lcid), enodeb=VALUES(enodeb),
            updated_at=NOW()");
    foreach ($pm as $label => $v) {
        $stmtPM->execute([$ot, $docType, $label,
            s($v['g4_rsrp']??$v['rsrp']??null), s($v['g4_rsrq']??$v['rsrq']??null),
            s($v['g4_rssnr']??$v['rssnr']??null), s($v['g4_bande']??$v['bande']??null),
            s($v['g4_operateur']??$v['operateur']??null),
            s($v['g5_rsrp']??null), s($v['g5_rsrq']??null),
            s($v['g5_bande']??null), s($v['g5_operateur']??null),
            s($v['speed_down']??$v['speedtest_dl']??$v['debit_dl']??null),
            s($v['speed_up']??$v['speedtest_ul']??$v['debit_ul']??null),
            s($v['speedtest_ping']??$v['ping']??null),
            s($v['notes']??null),
            s($v['lcid']??null), s($v['enb']??null)]);
    }

    // ── rapport_pico (upsert par PICO) ────────────────────────────────────────
    $stmtPI = $db->prepare("INSERT INTO rapport_pico
        (numero_ot, doc_type, label_pico, hauteur, cablage, longueur_cable, fixation, alimentation, notes)
        VALUES (?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
            hauteur=VALUES(hauteur), cablage=VALUES(cablage),
            longueur_cable=VALUES(longueur_cable), fixation=VALUES(fixation),
            alimentation=VALUES(alimentation), notes=VALUES(notes), updated_at=NOW()");
    foreach ($pi as $label => $v) {
        $stmtPI->execute([$ot, $docType, $label,
            s($v['hauteur']??null), s($v['cablage']??null),
            s($v['longueurCable']??$v['longueur_cable']??null),
            s($v['fixation']??null), s($v['alimentation']??null),
            s($v['notes']??null)]);
    }

    // ── rapport_oeuvre ────────────────────────────────────────────────────────
    $f = $oe['fournitures'] ?? [];
    $db->prepare("INSERT INTO rapport_oeuvre
        (numero_ot, doc_type, nb_techniciens, nb_jours, niveau_qualif, hauteur_travail_max,
         nacelle, nacelle_hauteur, pirl, echafaudage, escabeau, escabeau_hauteur,
         epi, perforateur, visseuse, chemin_cable, bandeau_prises,
         fournitures_auto, fournitures_extras,
         poe, chevilles, colliers, goulotte, piece_fixation,
         vlan, vlan_port, valide_par, marge_percent, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
            doc_type=VALUES(doc_type),
            nb_techniciens=VALUES(nb_techniciens), nb_jours=VALUES(nb_jours),
            niveau_qualif=VALUES(niveau_qualif), hauteur_travail_max=VALUES(hauteur_travail_max),
            nacelle=VALUES(nacelle), nacelle_hauteur=VALUES(nacelle_hauteur),
            pirl=VALUES(pirl), echafaudage=VALUES(echafaudage),
            escabeau=VALUES(escabeau), escabeau_hauteur=VALUES(escabeau_hauteur),
            epi=VALUES(epi), perforateur=VALUES(perforateur),
            visseuse=VALUES(visseuse), chemin_cable=VALUES(chemin_cable),
            bandeau_prises=VALUES(bandeau_prises),
            fournitures_auto=VALUES(fournitures_auto),
            fournitures_extras=VALUES(fournitures_extras),
            poe=VALUES(poe), chevilles=VALUES(chevilles),
            colliers=VALUES(colliers), goulotte=VALUES(goulotte),
            piece_fixation=VALUES(piece_fixation),
            vlan=VALUES(vlan), vlan_port=VALUES(vlan_port),
            valide_par=VALUES(valide_par), marge_percent=VALUES(marge_percent),
            notes=VALUES(notes), updated_at=NOW()")
       ->execute([$ot, $docType,
            n($oe['nbTechniciens']??null), n($oe['nbJours']??null),
            s($oe['niveauQualif']??null),  s($oe['hauteurTravailMax']??null),
            b($oe['nacelle']??false), s($oe['nacelleHauteur']??null),
            b($oe['pirl']??false), b($oe['echafaudage']??false),
            b($oe['escabeau']??false), s($oe['escabeauHauteur']??null),
            b($oe['epi']??false), b($oe['perforateur']??false),
            b($oe['visseuse']??false), b($oe['cheminCable']??false),
            b($oe['bandeauPrises']??false),
            b($oe['fournituresAuto']??true), s($oe['fournituresExtras']??null),
            b($f['poe']??true), b($f['chevilles']??true),
            b($f['colliers']??true), b($f['goulotte']??false),
            b($f['pieceFixation']??true),
            s($oe['vlan']??'NON'), s($oe['vlanPort']??null),
            s($oe['validePar']??null), n($oe['margePercent']??10),
            s($oe['notes']??null)]);

    // ── rapport_plans (photos de plan — partagées avec DOE) ─────────────────────
    $plans = $data['plans'] ?? [];
    if (!empty($plans)) {
        $stmtPlan = $db->prepare("INSERT INTO rapport_plans
            (numero_ot, plan_idx, plan_label, plan_photo, markers_json)
            VALUES (?,?,?,?,?)
            ON DUPLICATE KEY UPDATE
                plan_label=VALUES(plan_label),
                plan_photo=VALUES(plan_photo),
                markers_json=VALUES(markers_json),
                updated_at=NOW()");
        foreach ($plans as $idx => $pl) {
            // Stocker la photo base64 et les marqueurs (sans les photos PICO)
            $markersClean = array_map(function($m) {
                return ['id'=>$m['id']??'', 'type'=>$m['type']??'pm',
                        'label'=>$m['label']??'', 'x'=>$m['x']??0, 'y'=>$m['y']??0];
            }, $pl['markers'] ?? []);
            $stmtPlan->execute([
                $ot, (int)$idx,
                s($pl['label'] ?? 'Plan '.($idx+1)),
                s($pl['photo'] ?? null),      // base64 photo du plan de masse
                json_encode($markersClean, JSON_UNESCAPED_UNICODE)
            ]);
        }
    }

    // ── rapport_acces ─────────────────────────────────────────────────────────
    $db->prepare("INSERT INTO rapport_acces (numero_ot, doc_type, notes)
        VALUES (?,?,?)
        ON DUPLICATE KEY UPDATE doc_type=VALUES(doc_type), notes=VALUES(notes), updated_at=NOW()")
       ->execute([$ot, $docType, s($ac['notes']??null)]);

    // ── rapport_doe (uniquement pour type doe) ────────────────────────────────
    if ($doe !== null) {
        $raf = $doe['raf'] ?? [];
        $db->prepare("INSERT INTO rapport_doe
            (numero_ot, finalise, cablage_restant, equipements_restants,
             ressources, besoins_client, pico_non_installe, notes)
            VALUES (?,?,?,?,?,?,?,?)
            ON DUPLICATE KEY UPDATE
                finalise=VALUES(finalise),
                cablage_restant=VALUES(cablage_restant),
                equipements_restants=VALUES(equipements_restants),
                ressources=VALUES(ressources),
                besoins_client=VALUES(besoins_client),
                pico_non_installe=VALUES(pico_non_installe),
                notes=VALUES(notes), updated_at=NOW()")
           ->execute([$ot,
                b($doe['finalise']??false),
                s($raf['cablageRestant']??null),
                s($raf['equipementsRestants']??null),
                s($raf['ressources']??null),
                s($raf['besoinsClient']??null),
                json_encode($raf['picoNonInstalle']??[], JSON_UNESCAPED_UNICODE),
                s($raf['notes']??null)]);
    }
}

// ── Charger données structurées depuis DB pour pré-remplir un rapport ─────────
function loadByOT($ot) {
    $db = getDB();

    $garde = $db->prepare("SELECT * FROM rapport_garde WHERE numero_ot=?");
    $garde->execute([$ot]);
    $g = $garde->fetch() ?: [];

    $mesures = $db->prepare("SELECT * FROM rapport_mesures WHERE numero_ot=? ORDER BY label_pm");
    $mesures->execute([$ot]);
    $pm = [];
    foreach ($mesures->fetchAll() as $r) {
        $pm[$r['label_pm']] = [
            'g4_rsrp'=>$r['rsrp_4g'], 'g4_rsrq'=>$r['rsrq_4g'],
            'g4_rssnr'=>$r['rssnr_4g'], 'g4_bande'=>$r['bande_4g'],
            'g4_operateur'=>$r['operateur_4g'],
            'g5_rsrp'=>$r['rsrp_5g'], 'g5_rsrq'=>$r['rsrq_5g'],
            'g5_bande'=>$r['bande_5g'], 'g5_operateur'=>$r['operateur_5g'],
            'speedtest_dl'=>$r['debit_dl'], 'speedtest_ul'=>$r['debit_ul'],
            'speedtest_ping'=>$r['ping'], 'notes'=>$r['notes'],
        ];
    }

    $picos = $db->prepare("SELECT * FROM rapport_pico WHERE numero_ot=? ORDER BY label_pico");
    $picos->execute([$ot]);
    $pi = [];
    foreach ($picos->fetchAll() as $r) {
        $pi[$r['label_pico']] = [
            'hauteur'=>$r['hauteur'], 'cablage'=>$r['cablage'],
            'longueurCable'=>$r['longueur_cable'], 'fixation'=>$r['fixation'],
            'alimentation'=>$r['alimentation'], 'notes'=>$r['notes'],
        ];
    }

    $oeuvre = $db->prepare("SELECT * FROM rapport_oeuvre WHERE numero_ot=?");
    $oeuvre->execute([$ot]);
    $oe = $oeuvre->fetch() ?: [];

    $acces = $db->prepare("SELECT notes FROM rapport_acces WHERE numero_ot=?");
    $acces->execute([$ot]);
    $ac = $acces->fetch() ?: [];

    $doe_r = $db->prepare("SELECT * FROM rapport_doe WHERE numero_ot=?");
    $doe_r->execute([$ot]);
    $doe = $doe_r->fetch() ?: null;

    return [
        'numero_ot' => $ot,
        'garde' => [
            'ot'           => $ot,
            'raisonSociale'=> $g['raison_sociale'] ?? '',
            'adresse'      => $g['adresse']        ?? '',
            'contact'      => $g['contact']        ?? '',
            'telephone'    => $g['telephone']      ?? '',
            'email'        => $g['email']          ?? '',
            'cdp'          => $g['cdp']            ?? '',
            'technicien'   => $g['technicien']     ?? '',
            'date'         => $g['date_rapport']   ?? '',
        ],
        'pmData'   => $pm,
        'picoData' => $pi,
        'oeuvre'   => $oe ? [
            'nbTechniciens'   => $oe['nb_techniciens'],
            'nbJours'         => $oe['nb_jours'],
            'niveauQualif'    => $oe['niveau_qualif'],
            'hauteurTravailMax'=> $oe['hauteur_travail_max'],
            'nacelle'         => (bool)$oe['nacelle'],
            'nacelleHauteur'  => $oe['nacelle_hauteur'],
            'pirl'            => (bool)$oe['pirl'],
            'echafaudage'     => (bool)$oe['echafaudage'],
            'escabeau'        => (bool)$oe['escabeau'],
            'escabeauHauteur' => $oe['escabeau_hauteur'],
            'epi'             => (bool)$oe['epi'],
            'perforateur'     => (bool)$oe['perforateur'],
            'visseuse'        => (bool)$oe['visseuse'],
            'cheminCable'     => (bool)$oe['chemin_cable'],
            'bandeauPrises'   => (bool)$oe['bandeau_prises'],
            'fournituresAuto' => (bool)$oe['fournitures_auto'],
            'fournituresExtras'=> $oe['fournitures_extras'],
            'fournitures'     => [
                'poe'          => (bool)$oe['poe'],
                'chevilles'    => (bool)$oe['chevilles'],
                'colliers'     => (bool)$oe['colliers'],
                'goulotte'     => (bool)$oe['goulotte'],
                'pieceFixation'=> (bool)$oe['piece_fixation'],
            ],
            'vlan'         => $oe['vlan'],
            'vlanPort'     => $oe['vlan_port'],
            'validePar'    => $oe['valide_par'],
            'margePercent' => $oe['marge_percent'],
            'notes'        => $oe['notes'],
        ] : [],
        'acces' => ['notes' => $ac['notes'] ?? ''],
        'doe'   => $doe ? [
            'finalise' => (bool)$doe['finalise'],
            'raf' => [
                'cablageRestant'       => $doe['cablage_restant'],
                'equipementsRestants'  => $doe['equipements_restants'],
                'ressources'           => $doe['ressources'],
                'besoinsClient'        => $doe['besoins_client'],
                'picoNonInstalle'      => json_decode($doe['pico_non_installe']??'[]', true),
                'notes'                => $doe['notes'],
            ],
        ] : null,
    ];
}

// ── ROUTES ────────────────────────────────────────────────────────────────────
try {
    initDB();
    $action = $_GET['action'] ?? '';

    switch ($action) {

        // ── Profiles (inchangé) ───────────────────────────────────────────────
        case 'get_profiles':
            checkAuth();
            $rows = getDB()->query("SELECT data FROM profiles
                ORDER BY JSON_EXTRACT(data,'$.isAdmin') DESC,
                         JSON_EXTRACT(data,'$.name') ASC")->fetchAll();
            $profiles = array_map(function($r) {
                $p = json_decode($r['data'], true);
                // Toujours forcer isAdmin pour admin_omar
                if (($p['id'] ?? '') === 'admin_omar' || ($p['username'] ?? '') === '5671') {
                    $p['isAdmin'] = true;
                    $p['role'] = 'admin';
                }
                return $p;
            }, $rows);
            jsonOut(['ok'=>true, 'profiles'=>$profiles]);

        case 'save_profiles':
            checkAuth();
            $body = getBody();
            $profiles = $body['profiles'] ?? null;
            if (!is_array($profiles)) jsonError('profiles requis');
            $db = getDB();
            $db->beginTransaction();
            try {
                $ids = array_column($profiles, 'id');
                if (!empty($ids)) {
                    $ph = implode(',', array_fill(0, count($ids), '?'));
                    $db->prepare("DELETE FROM profiles WHERE id NOT IN ($ph)")->execute($ids);
                }
                $st = $db->prepare("INSERT INTO profiles (id,data) VALUES (?,?)
                    ON DUPLICATE KEY UPDATE data=VALUES(data), updated_at=NOW()");
                foreach ($profiles as $p) {
                    unset($p['tempPwdClear']);
                    $st->execute([$p['id'], json_encode($p, JSON_UNESCAPED_UNICODE)]);
                }
                $db->commit();
                jsonOut(['ok'=>true, 'count'=>count($profiles)]);
            } catch (Exception $e) { $db->rollBack(); jsonError('save_profiles: '.$e->getMessage(), 500); }

        // ── Config (inchangé) ─────────────────────────────────────────────────
        case 'get_config':
            checkAuth();
            $rows = getDB()->query("SELECT key_name, value FROM app_config")->fetchAll();
            $cfg = [];
            foreach ($rows as $r) $cfg[$r['key_name']] = $r['value'];
            jsonOut(['ok'=>true, 'config'=>$cfg]);

        case 'set_config':
            checkAuth();
            $body = getBody();
            if (!($body['key']??null)) jsonError('key requis');
            getDB()->prepare("INSERT INTO app_config (key_name,value) VALUES (?,?)
                ON DUPLICATE KEY UPDATE value=VALUES(value), updated_at=NOW()")
               ->execute([$body['key'], $body['value']??'']);
            jsonOut(['ok'=>true]);

        // ── Sauvegarde rapport complet ────────────────────────────────────────
        // POST /api.php?action=save_rapport&k=...
        // body: { id, docType, statut, data: {...} }
        case 'save_rapport':
            checkAuth();
            $body = getBody();
            $id      = $body['id']      ?? null;
            $docType = $body['docType'] ?? 'audit';
            $data    = $body['data']    ?? null;
            if (!$id || !$data) jsonError('id et data requis');
            $db = getDB();
            $db->beginTransaction();
            try {
                // 1. Sauvegarde blob JSON (compatibilité localStorage)
                $db->prepare("INSERT INTO profiles (id, data) VALUES (?,?)
                    ON DUPLICATE KEY UPDATE data=VALUES(data), updated_at=NOW()")
                   ->execute(['__rapport__'.$id,
                       json_encode(['id'=>$id,'docType'=>$docType,'data'=>$data], JSON_UNESCAPED_UNICODE)]);
                // 2. Sauvegarde structurée dans les tables métier
                $data['statut'] = $body['statut'] ?? 'En cours';
                saveRapportData($id, $docType, $data);
                $db->commit();
                jsonOut(['ok'=>true, 'id'=>$id, 'numero_ot'=>trim($data['garde']['ot']??'')]);
            } catch (Exception $e) { $db->rollBack(); jsonError('save_rapport: '.$e->getMessage(), 500); }

        // ── Récupérer un rapport par ID ───────────────────────────────────────
        // GET /api.php?action=get_rapport&id=audit_XXXXX&k=...
        case 'get_rapport':
            checkAuth();
            $id = $_GET['id'] ?? null;
            if (!$id) jsonError('id requis');
            $row = getDB()->prepare("SELECT data FROM profiles WHERE id=?");
            $row->execute(['__rapport__'.$id]);
            $r = $row->fetch();
            if (!$r) jsonError('Rapport introuvable', 404);
            jsonOut(['ok'=>true, 'rapport'=>json_decode($r['data'], true)]);

        // ── Liste des rapports ────────────────────────────────────────────────
        // GET /api.php?action=list_rapports&k=...  [&doc_type=audit] [&ot=OT123]
        case 'list_rapports':
            checkAuth();
            $where = ['1=1'];
            $params = [];
            if (!empty($_GET['doc_type'])) { $where[] = 'doc_type=?'; $params[] = $_GET['doc_type']; }
            if (!empty($_GET['ot']))       { $where[] = 'numero_ot=?'; $params[] = $_GET['ot']; }
            $sql = "SELECT id, numero_ot, doc_type, statut, created_at, updated_at
                    FROM rapports WHERE ".implode(' AND ',$where)."
                    ORDER BY updated_at DESC LIMIT 200";
            $st = getDB()->prepare($sql);
            $st->execute($params);
            jsonOut(['ok'=>true, 'rapports'=>$st->fetchAll()]);

        // ── Charger données structurées par N° OT (pré-remplissage) ──────────
        // GET /api.php?action=get_by_ot&ot=OT123&k=...
        case 'get_by_ot':
            checkAuth();
            $ot = trim($_GET['ot'] ?? '');
            if (!$ot) jsonError('ot requis');
            jsonOut(['ok'=>true, 'data'=>loadByOT($ot)]);

        // ── Synthèse site (toutes données d'un N° OT tous types) ─────────────
        // GET /api.php?action=site_summary&ot=OT123&k=...
        
        // ── Récupérer les plans d'un rapport par N° OT (pour pré-remplir DOE) ─────
        // GET /api.php?action=get_plans&ot=OT-2025-001&k=...
        case 'get_plans':
            checkAuth();
            $ot2 = trim($_GET['ot'] ?? '');
            if (!$ot2) jsonError('ot requis');
            $db  = getDB();
            $rows = $db->prepare("SELECT plan_idx, plan_label, plan_photo, markers_json
                FROM rapport_plans WHERE numero_ot=? ORDER BY plan_idx ASC");
            $rows->execute([$ot2]);
            $plans = [];
            foreach ($rows->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $plans[] = [
                    'id'       => 'plan_'.$row['plan_idx'],
                    'label'    => $row['plan_label'],
                    'photo'    => $row['plan_photo'],
                    'markers'  => json_decode($row['markers_json'] ?? '[]', true),
                ];
            }
            jsonOut(['ok'=>true, 'ot'=>$ot2, 'plans'=>$plans]);
            break;

case 'site_summary':
            checkAuth();
            $ot = trim($_GET['ot'] ?? '');
            if (!$ot) jsonError('ot requis');
            $db = getDB();

            $rapports = $db->prepare("SELECT id, doc_type, statut, updated_at FROM rapports WHERE numero_ot=? ORDER BY doc_type");
            $rapports->execute([$ot]);

            $mesures = $db->prepare("SELECT * FROM rapport_mesures WHERE numero_ot=? ORDER BY doc_type, label_pm");
            $mesures->execute([$ot]);

            $picos = $db->prepare("SELECT * FROM rapport_pico WHERE numero_ot=? ORDER BY doc_type, label_pico");
            $picos->execute([$ot]);

            $garde = $db->prepare("SELECT * FROM rapport_garde WHERE numero_ot=?");
            $garde->execute([$ot]);

            jsonOut([
                'ok'       => true,
                'numero_ot'=> $ot,
                'rapports' => $rapports->fetchAll(),
                'garde'    => $garde->fetch() ?: null,
                'mesures'  => $mesures->fetchAll(),
                'picos'    => $picos->fetchAll(),
            ]);

        // ── Ping ──────────────────────────────────────────────────────────────
        case 'ping':
            getDB();
            jsonOut(['ok'=>true, 'version'=>'2.0', 'app'=>'Audit PICO BTS']);


        // ── Envoi rapport par email ───────────────────────────────────────────────
        case 'send_report_mail': {
            checkAuth();

            // Validation des paramètres
            $email = isset($_POST['email']) ? trim($_POST['email']) : '';
            $ot    = isset($_POST['ot'])    ? trim($_POST['ot'])    : 'rapport';
            $type  = isset($_POST['type'])  ? trim($_POST['type'])  : 'Rapport';

            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                jsonError('Adresse email invalide', 400);
            }

            // Vérifier le fichier uploadé
            if (!isset($_FILES['pdf']) || $_FILES['pdf']['error'] !== UPLOAD_ERR_OK) {
                $err = isset($_FILES['pdf']) ? $_FILES['pdf']['error'] : 'Fichier manquant';
                jsonError('Fichier PDF invalide: ' . $err, 400);
            }

            $fileData = file_get_contents($_FILES['pdf']['tmp_name']);
            if ($fileData === false || strlen($fileData) < 100) {
                jsonError('Fichier vide ou illisible', 400);
            }

            $fileName  = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', basename($_FILES['pdf']['name']));
            if (!$fileName) $fileName = 'Rapport_' . $ot . '.docx';

            // Détecter type MIME selon extension
            $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
            $mime = ($ext === 'pdf') ? 'application/pdf'
                  : (($ext === 'docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                  : 'application/octet-stream');

            $fileB64   = chunk_split(base64_encode($fileData));
            $boundary  = '----=_Part_' . md5(uniqid(mt_rand(), true));
            $from      = 'noreply@c-it.fr';
            $fromName  = 'Générateur de Rapport Bouygues';
            $dateStr   = date('d/m/Y à H:i');

            // En-têtes MIME
            $headers  = "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <{$from}>\r\n";
            $headers .= "Reply-To: {$from}\r\n";
            $headers .= "MIME-Version: 1.0\r\n";
            $headers .= "Content-Type: multipart/mixed; boundary=\"{$boundary}\"\r\n";
            $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";

            // Sujet
            $subject = "=?UTF-8?B?" . base64_encode("[Rapport] {$type} — OT {$ot}") . "?=";

            // Corps texte
            $bodyText  = "Bonjour,\r\n\r\n";
            $bodyText .= "Veuillez trouver ci-joint le rapport : {$type}\r\n";
            $bodyText .= "Numéro d'OT : {$ot}\r\n";
            $bodyText .= "Généré le : {$dateStr}\r\n\r\n";
            $bodyText .= "Ce rapport a été généré automatiquement par l'application Générateur de Rapport Bouygues Telecom.\r\n\r\n";
            $bodyText .= "Cordialement,\r\nL'équipe technique Sogetrel\r\n";

            // Corps HTML
            $bodyHtml  = "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='font-family:Calibri,Arial,sans-serif;color:#1a1a2e;'>\r\n";
            $bodyHtml .= "<div style='background:#00477F;padding:20px;text-align:center;'>";
            $bodyHtml .= "<h2 style='color:#fff;margin:0;'>Rapport Bouygues Telecom</h2></div>\r\n";
            $bodyHtml .= "<div style='padding:24px;'>";
            $bodyHtml .= "<p>Bonjour,</p>";
            $bodyHtml .= "<p>Veuillez trouver ci-joint le rapport : <strong>{$type}</strong></p>";
            $bodyHtml .= "<table style='border-collapse:collapse;width:100%;max-width:400px;margin:16px 0;'>";
            $bodyHtml .= "<tr><td style='padding:8px;background:#f0f4ff;font-weight:bold;'>Numéro d'OT</td><td style='padding:8px;border:1px solid #ddd;'>" . htmlspecialchars($ot) . "</td></tr>";
            $bodyHtml .= "<tr><td style='padding:8px;background:#f0f4ff;font-weight:bold;'>Généré le</td><td style='padding:8px;border:1px solid #ddd;'>{$dateStr}</td></tr>";
            $bodyHtml .= "</table>";
            $bodyHtml .= "<p style='color:#666;font-size:12px;'>Ce rapport a été généré automatiquement par l'application Générateur de Rapport.</p>";
            $bodyHtml .= "</div></body></html>\r\n";

            // Assemblage multipart
            $message  = "--{$boundary}\r\n";
            $message .= "Content-Type: multipart/alternative; boundary=\"alt_{$boundary}\"\r\n\r\n";
            $message .= "--alt_{$boundary}\r\n";
            $message .= "Content-Type: text/plain; charset=UTF-8\r\n";
            $message .= "Content-Transfer-Encoding: base64\r\n\r\n";
            $message .= chunk_split(base64_encode($bodyText)) . "\r\n";
            $message .= "--alt_{$boundary}\r\n";
            $message .= "Content-Type: text/html; charset=UTF-8\r\n";
            $message .= "Content-Transfer-Encoding: base64\r\n\r\n";
            $message .= chunk_split(base64_encode($bodyHtml)) . "\r\n";
            $message .= "--alt_{$boundary}--\r\n\r\n";
            // Pièce jointe
            $message .= "--{$boundary}\r\n";
            $message .= "Content-Type: {$mime}; name=\"{$fileName}\"\r\n";
            $message .= "Content-Transfer-Encoding: base64\r\n";
            $message .= "Content-Disposition: attachment; filename=\"{$fileName}\"\r\n\r\n";
            $message .= $fileB64 . "\r\n";
            $message .= "--{$boundary}--\r\n";

            // Envoi (@ supprime les warnings, try/catch pour les exceptions)
            try {
                $sent = @mail($email, $subject, $message, $headers);
            } catch(Exception $me) {
                jsonError('Exception mail: '.$me->getMessage(), 500);
            }

            if ($sent) {
                jsonOk(['sent'=>true,'to'=>$email,'file'=>$fileName,'size_kb'=>round(strlen($fileData)/1024)]);
            } else {
                jsonError('mail() a retourne false - verifiez noreply@c-it.fr sur OVH', 500);
            }
        }


        // ── Ajout d'un technicien ────────────────────────────────────────────────
        case 'add_profile': {
            checkAuth();
            $body = getBody();
            if (!isset($body['name']) || empty(trim($body['name']))) jsonError('Nom requis', 400);
            if (!isset($body['username']) || empty(trim($body['username']))) jsonError('Identifiant requis', 400);
            if (!isset($body['pwd_hash'])) jsonError('Code secret requis', 400);

            $db = getDB();

            // Vérifier unicité du login
            $existing = $db->prepare("SELECT id FROM profiles WHERE JSON_EXTRACT(data,'$.username')=?");
            $existing->execute([trim($body['username'])]);
            if ($existing->fetch()) jsonError('Cet identifiant est déjà utilisé', 409);

            $newId    = 'tech_'.bin2hex(random_bytes(4));
            $role     = $body['role'] ?? 'technicien';
            $profile  = json_encode([
                'id'           => $newId,
                'name'         => trim($body['name']),
                'username'     => trim($body['username']),
                'phone'        => trim($body['phone'] ?? ''),
                'pwdHash'      => $body['pwd_hash'],
                'isAdmin'      => $role === 'admin',
                'isResponsable'=> $role === 'responsable',
                'active'       => true,
                'needSetup'    => false,
                'createdAt'    => date('Y-m-d\TH:i:s\Z'),
            ], JSON_UNESCAPED_UNICODE);

            $stmt = $db->prepare("INSERT INTO profiles (id, data) VALUES (?, ?)");
            $stmt->execute([$newId, $profile]);

            jsonOk(['id' => $newId, 'message' => 'Technicien créé avec succès']);
        }

        default:
            jsonError('Action inconnue: '.$action);
    }
} catch (Exception $e) {
    jsonError('Erreur serveur: '.$e->getMessage(), 500);
}
