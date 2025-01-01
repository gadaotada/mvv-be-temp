CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_id VARCHAR(255) DEFAULT NULL,
    provider_type VARCHAR(50) DEFAULT 'local',
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY provider_unique (provider_id, provider_type)
);

CREATE INDEX idx_users_email ON users(email);

CREATE TABLE activation_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    permissions JSON NOT NULL,
    description TEXT,
    inherits JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE user_roles (
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE TABLE sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id INT NOT NULL,
    access_token TEXT NOT NULL,
    access_token_expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_access_token ON sessions(access_token(50));

-- INSERT default db values
INSERT INTO roles (name, description, permissions, inherits) VALUES (
    'admin',
    'Administrator',
    '["*"]',
    '[]'
);

INSERT INTO roles (name, description, permissions, inherits) VALUES (
    'user',
    'User',
    '[
        "post:read:own",
        "post:create:own",
        "post:update:own",
        "post:delete:own",
        "comments:create:own",
        "comments:read:own",
        "comments:update:own",
        "comments:delete:own",
        "users:read:own",
        "users:update:own"
    ]',
    '[]'
);

INSERT INTO users (email, password, name, active) VALUES (
    'admin@yourdomain.com',
    '$argon2id$v=19$m=65536,t=3,p=4$x2oFKrSmao+2TLWOCROrXQ$5Jk/Dz3LCaZ2i8m1xLcFdMl8WhRdH63w1VOAI3MAHVc',
    'MVV-BE ADMIN',
    '1'
);

INSERT INTO user_roles (user_id, role_id) VALUES (
    1,
    1
);

INSERT INTO users (email, password, name, active) VALUES (
    'user@yourdomain.com',
    '$argon2id$v=19$m=65536,t=3,p=4$x2oFKrSmao+2TLWOCROrXQ$5Jk/Dz3LCaZ2i8m1xLcFdMl8WhRdH63w1VOAI3MAHVc',
    'MVV-BE USER',
    '1'
);

INSERT INTO user_roles (user_id, role_id) VALUES (
    2,
    2
);