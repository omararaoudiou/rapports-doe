-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Hôte : citfrjgtov050671.mysql.db
-- Généré le : dim. 22 mars 2026 à 00:24
-- Version du serveur : 8.4.7-7
-- Version de PHP : 8.1.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `citfrjgtov050671`
--

-- --------------------------------------------------------

--
-- Structure de la table `profiles`
--

DROP TABLE IF EXISTS `profiles`;
CREATE TABLE `profiles` (
  `id` varchar(64) NOT NULL,
  `data` longtext NOT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Déchargement des données de la table `profiles`
--

INSERT INTO `profiles` (`id`, `data`, `updated_at`) VALUES
('admin_omar', '{\"id\":\"admin_omar\",\"username\":\"5671\",\"name\":\"Administrateur\",\"phone\":\"\",\"isAdmin\":true,\"active\":true,\"pwdHash\":\"yhsoxs\",\"needSetup\":false,\"createdAt\":\"2026-03-20T10:21:51Z\",\"role\":\"admin\"}', '2026-03-20 15:13:59'),
('u_1774004295239', '{\"id\":\"u_1774004295239\",\"name\":\"Omar ARAOUDIOU\",\"username\":\"1111\",\"phone\":\"0667484976\",\"isAdmin\":false,\"isResponsable\":false,\"active\":true,\"pwdHash\":\"yhvpdx\",\"needSetup\":false,\"role\":\"technicien\",\"expiryDate\":\"2026-12-31\",\"createdAt\":\"2026-03-20T10:58:15.239Z\",\"deviceId_desktop\":\"4333dc6116c1ee865c2b47da45fb60ba\",\"deviceInfo_desktop\":\"Win32 — 20\\/03\\/2026\",\"deviceId\":\"4333dc6116c1ee865c2b47da45fb60ba\",\"deviceId_mobile\":\"e0cdb15898579cec19e87afd0ef2bde8\",\"deviceInfo_mobile\":\"iPhone — 20\\/03\\/2026\"}', '2026-03-20 15:13:59'),
('u_1774004348980', '{\"id\":\"u_1774004348980\",\"name\":\"Rawad SAADI\",\"username\":\"1112\",\"phone\":\"0659122242\",\"isAdmin\":false,\"isResponsable\":false,\"active\":true,\"pwdHash\":\"yhvpdy\",\"needSetup\":false,\"role\":\"technicien\",\"expiryDate\":\"2026-12-31\",\"createdAt\":\"2026-03-20T10:59:08.980Z\"}', '2026-03-20 15:13:59'),
('u_1774004377815', '{\"id\":\"u_1774004377815\",\"name\":\"omar\",\"username\":\"5555\",\"phone\":\"0667484976\",\"isAdmin\":false,\"isResponsable\":true,\"active\":true,\"pwdHash\":\"yhspqd\",\"needSetup\":false,\"role\":\"responsable\",\"expiryDate\":\"2026-12-31\",\"createdAt\":\"2026-03-20T10:59:37.815Z\",\"deviceId_desktop\":\"4333dc6116c1ee865c2b47da45fb60ba\",\"deviceInfo_desktop\":\"Win32 — 20\\/03\\/2026\",\"deviceId\":\"4333dc6116c1ee865c2b47da45fb60ba\",\"deviceId_mobile\":\"f939d7618efa7c91055472121f99c7a7\",\"deviceInfo_mobile\":\"iPhone — 20\\/03\\/2026\"}', '2026-03-20 15:13:59'),
('u_1774019495626', '{\"id\":\"u_1774019495626\",\"name\":\"CHRISPO PRIMO\",\"username\":\"9999\",\"phone\":\"\",\"isAdmin\":false,\"isResponsable\":false,\"active\":true,\"pwdHash\":\"yi1op1\",\"needSetup\":false,\"role\":\"technicien\",\"expiryDate\":null,\"createdAt\":\"2026-03-20T15:11:35.626Z\"}', '2026-03-20 15:13:59');

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `profiles`
--
ALTER TABLE `profiles`
  ADD PRIMARY KEY (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
