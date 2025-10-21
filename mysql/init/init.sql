-- Product Search Database
CREATE DATABASE IF NOT EXISTS sample_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sample_db;

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET character_set_client = utf8mb4;
SET character_set_connection = utf8mb4;
SET character_set_results = utf8mb4;

-- Products table with 6 searchable columns
DROP TABLE IF EXISTS products;
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Sample product data (適当なデータ)
INSERT INTO products (name, category, brand, model, description, price) VALUES
('iPhone 15 Pro', 'スマートフォン', 'Apple', 'A2848', '最新のiPhoneシリーズ。チタニウム製で軽量化を実現', 159800.00),
('MacBook Air M2', 'ノートパソコン', 'Apple', 'MLY33J/A', '薄型軽量で高性能なMacBook Air', 134800.00),
('Surface Pro 9', 'タブレット', 'Microsoft', '2022', '2in1デザインのプロ向けタブレット', 98800.00),
('Dell XPS 13', 'ノートパソコン', 'Dell', '9320', 'コンパクトで高性能なビジネスノート', 129800.00),
('iPad Air', 'タブレット', 'Apple', '第5世代', '軽量で高性能なiPad', 84800.00),
('Galaxy S24', 'スマートフォン', 'Samsung', 'SM-S921', '高性能カメラ搭載のAndroidスマートフォン', 119800.00),
('ThinkPad X1 Carbon', 'ノートパソコン', 'Lenovo', 'Gen 11', 'ビジネス向け軽量ノートパソコン', 189800.00),
('PlayStation 5', 'ゲーム機', 'Sony', 'CFI-2000A01', '次世代ゲーム機でリアルなゲーム体験', 66980.00),
('Nintendo Switch', 'ゲーム機', 'Nintendo', 'HAD-S-KAAAA', '携帯・据置両対応のゲーム機', 37980.00),
('Apple Watch Series 9', 'スマートウォッチ', 'Apple', 'MR933J/A', '健康管理機能付きスマートウォッチ', 59800.00),
('AirPods Pro', 'イヤホン', 'Apple', 'MQD83J/A', 'ノイズキャンセリング機能付きワイヤレスイヤホン', 39800.00),
('Echo Dot', 'スマートスピーカー', 'Amazon', '第5世代', 'Alexa搭載コンパクトスマートスピーカー', 7980.00),
('Kindle Paperwhite', '電子書籍リーダー', 'Amazon', '第11世代', '防水機能付き電子書籍リーダー', 16980.00),
('Canon EOS R5', 'デジタルカメラ', 'Canon', 'EOS R5', 'プロ仕様ミラーレスカメラ', 498000.00),
('Sony α7 IV', 'デジタルカメラ', 'Sony', 'ILCE-7M4', '高画質フルサイズミラーレスカメラ', 328000.00),
('LG OLED55C3PJA', 'テレビ', 'LG', 'OLED55C3PJA', '55インチ有機EL 4Kテレビ', 178000.00),
('Dyson V15 Detect', '掃除機', 'Dyson', 'SV22', 'レーザー検知機能付きコードレス掃除機', 98800.00),
('Roomba j7+', 'ロボット掃除機', 'iRobot', 'j755860', '自動ゴミ収集機能付きロボット掃除機', 129800.00),
('Bose QuietComfort 45', 'ヘッドホン', 'Bose', 'QC45', 'ノイズキャンセリング機能付きヘッドホン', 39600.00),
('Magic Keyboard', 'キーボード', 'Apple', 'MK2A3J/A', 'iPad Pro用キーボード', 49800.00),
('Magic Mouse', 'マウス', 'Apple', 'MK2E3J/A', 'ワイヤレスマウス', 11800.00),
('Surface Keyboard', 'キーボード', 'Microsoft', '3YJ-00020', 'Surface用ワイヤレスキーボード', 13800.00),
('Logitech MX Master 3S', 'マウス', 'Logitech', 'MX Master 3S', '高精度ワイヤレスマウス', 15800.00),
('HHKB Professional HYBRID Type-S', 'キーボード', 'PFU', 'PD-KB800WS', '静音設計プログラマー向けキーボード', 36300.00),
('Steam Deck', '携帯ゲーム機', 'Valve', '512GB', 'PC向けゲーム対応携帯機', 79800.00);
