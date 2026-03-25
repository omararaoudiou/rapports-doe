SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

CREATE TABLE IF NOT EXISTS `companies` (
  `id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `logo_path` varchar(255) DEFAULT NULL,
  `phone` varchar(64) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `direction_label` varchar(255) DEFAULT NULL,
  `signature_name` varchar(255) DEFAULT NULL,
  `signature_role` varchar(255) DEFAULT NULL,
  `ocr_profile` varchar(64) DEFAULT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `export_settings_json` longtext DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_companies_enabled` (`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `profile_companies` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `profile_id` varchar(64) NOT NULL,
  `company_id` varchar(64) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_profile_company` (`profile_id`,`company_id`),
  KEY `idx_pc_profile` (`profile_id`),
  KEY `idx_pc_company` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `reports` (
  `id` varchar(64) NOT NULL,
  `type` varchar(64) NOT NULL,
  `status` varchar(64) NOT NULL DEFAULT 'brouillon',
  `owner_profile_id` varchar(64) NOT NULL,
  `created_by_profile_id` varchar(64) NOT NULL,
  `assigned_to_profile_id` varchar(64) DEFAULT NULL,
  `company_id` varchar(64) DEFAULT NULL,
  `ot` varchar(128) DEFAULT NULL,
  `client_name` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `contact_name` varchar(255) DEFAULT NULL,
  `archived` tinyint(1) NOT NULL DEFAULT 0,
  `archived_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `completed_at` datetime DEFAULT NULL,
  `transferred_at` datetime DEFAULT NULL,
  `data_json` longtext NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_reports_type` (`type`),
  KEY `idx_reports_status` (`status`),
  KEY `idx_reports_owner` (`owner_profile_id`),
  KEY `idx_reports_created_by` (`created_by_profile_id`),
  KEY `idx_reports_assigned_to` (`assigned_to_profile_id`),
  KEY `idx_reports_company` (`company_id`),
  KEY `idx_reports_archived` (`archived`),
  KEY `idx_reports_ot` (`ot`),
  KEY `idx_reports_created_at` (`created_at`),
  KEY `idx_reports_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `report_transfers` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `report_id` varchar(64) NOT NULL,
  `transfer_mode` enum('move','copy') NOT NULL DEFAULT 'move',
  `from_profile_id` varchar(64) NOT NULL,
  `to_profile_id` varchar(64) NOT NULL,
  `transferred_by_profile_id` varchar(64) NOT NULL,
  `comment_text` text DEFAULT NULL,
  `transferred_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rt_report` (`report_id`),
  KEY `idx_rt_from` (`from_profile_id`),
  KEY `idx_rt_to` (`to_profile_id`),
  KEY `idx_rt_by` (`transferred_by_profile_id`),
  KEY `idx_rt_date` (`transferred_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `report_exports` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `report_id` varchar(64) NOT NULL,
  `export_type` enum('pdf','word','json','zip') NOT NULL,
  `exported_by_profile_id` varchar(64) NOT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_re_report` (`report_id`),
  KEY `idx_re_type` (`export_type`),
  KEY `idx_re_by` (`exported_by_profile_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `report_imports` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `report_id` varchar(64) DEFAULT NULL,
  `imported_by_profile_id` varchar(64) NOT NULL,
  `import_type` enum('json','zip') NOT NULL,
  `source_file_name` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ri_report` (`report_id`),
  KEY `idx_ri_type` (`import_type`),
  KEY `idx_ri_by` (`imported_by_profile_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `app_settings` (
  `setting_key` varchar(128) NOT NULL,
  `setting_value` longtext DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES
('sync_auto_archive_days', '90'),
('default_period_filter_days', '90'),
('signal_quality_mode', '4g5g_rsrp'),
('allow_report_transfer', '1'),
('allow_report_duplication', '1')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

INSERT INTO `companies` (`id`, `name`, `ocr_profile`, `enabled`) VALUES
('sogetrel', 'Sogetrel', 'sogetrel', 1),
('bugbusters', 'Bugbusters', 'bugbusters', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `ocr_profile` = VALUES(`ocr_profile`), `enabled` = VALUES(`enabled`);

COMMIT;
