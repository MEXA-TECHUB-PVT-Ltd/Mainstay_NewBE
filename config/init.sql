CREATE TABLE IF NOT EXISTS users (
    id bigserial NOT NULL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255),
    first_name varchar(255),
    last_name varchar(255),
    code VARCHAR(4),
    -- 4 digit code
    exp_code TIMESTAMPTZ,
    role VARCHAR(50) NOT NULL,
    status BOOLEAN DEFAULT false,
    block BOOLEAN DEFAULT false,
    deleted BOOLEAN DEFAULT false,
    badge TEXT DEFAULT 'NULL',
    deleted_at TIMESTAMPTZ,
    device_id TIMESTAMP DEFAULT NOW(),
    lat DOUBLE PRECISION,
    long DOUBLE PRECISION,
    is_block BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS coachee_v2 (
    id SERIAL PRIMARY KEY,
    date_of_birth DATE,
    phone VARCHAR(255),
    gender VARCHAR(255),
    profile_pic VARCHAR(255),
    customer_id TEXT,
    interests INTEGER [] DEFAULT ARRAY []::INTEGER [],
    language VARCHAR(255),
    country_id INTEGER REFERENCES country(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW (),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS coach_v2 (
    id SERIAL PRIMARY KEY,
    about TEXT,
    language_ids INT [] DEFAULT '{}',
    coaching_area_ids INT [] DEFAULT '{}',
    is_completed BOOLEAN DEFAULT FALSE,
    is_stripe_completed BOOLEAN DEFAULT FALSE,
    profile_pic VARCHAR(255),
    admin_verified BOOLEAN DEFAULT FALSE,
    stripe_account_id TEXT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW (),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS coachee (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    date_of_birth DATE,
    email VARCHAR(255),
    phone VARCHAR(255),
    user_type VARCHAR(255),
    gender VARCHAR(255),
    code INTEGER,
    password VARCHAR(255),
    exp_code TIMESTAMPTZ,
    status BOOLEAN DEFAULT false,
    block BOOLEAN DEFAULT false,
    deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMP DEFAULT NOW (),
    profile_pic VARCHAR(255),
    customer_id text,
    interests INTEGER [] DEFAULT ARRAY []::INTEGER [],
    language VARCHAR(255),
    country_id INTEGER REFERENCES country(id)
);
CREATE TABLE IF NOT EXISTS coach (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    user_type VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    about TEXT,
    language_ids INT [] DEFAULT '{}',
    coaching_area_ids INT [] DEFAULT '{}',
    password VARCHAR(255) NOT NULL,
    status BOOLEAN DEFAULT false,
    is_completed BOOLEAN DEFAULT FALSE,
    profile_pic VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW (),
    code INTEGER,
    exp_code TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS coach_availability (
    id SERIAL PRIMARY KEY,
    coach_id INT REFERENCES Coach(id) ON DELETE CASCADE,
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    duration_ids INT [] DEFAULT ARRAY []::INT [],
    created_at TIMESTAMP DEFAULT current_timestamp
);
CREATE TABLE IF NOT EXISTS duration (
    id SERIAL PRIMARY KEY,
    coach_id INT UNIQUE REFERENCES coach(id) ON DELETE CASCADE,
    user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    details JSONB [] NOT NULL
);
CREATE TABLE IF NOT EXISTS days (
    id SERIAL PRIMARY KEY,
    status BOOLEAN DEFAULT false,
    name VARCHAR(20) NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS section (
    id SERIAL PRIMARY KEY,
    section_details JSONB NOT NULL,
    coach_id INT REFERENCES coach(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS coach_section (
    id SERIAL PRIMARY KEY,
    section_details JSONB NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS languages (
    id SERIAL PRIMARY KEY,
    name text,
    code VARCHAR(50) UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS uploads (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(255),
    file_type VARCHAR(255),
    mime_type VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW (),
    updated_at TIMESTAMP DEFAULT NOW ()
);
CREATE TABLE IF NOT EXISTS coach_area (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    german_name VARCHAR(255),
    icon VARCHAR(255)
);
CREATE TABLE IF NOT EXISTS card (
    id SERIAL PRIMARY KEY,
    customer_id text,
    coachee_id INT REFERENCES coachee(id) ON DELETE CASCADE,
    card_id text,
    finger_print text,
    created_at TIMESTAMP DEFAULT current_timestamp
);
-- CREATE TABLE IF NOT EXISTS session (
--     id SERIAL PRIMARY KEY,
--     coaching_area_id INT NOT NULL,
--     coach_id INT NOT NULL,
--     coachee_id INT NOT NULL,
--     status VARCHAR(255) DEFAULT 'pending',
--     payment_status BOOLEAN DEFAULT false,
--     date DATE NOT NULL,
--     duration INT NOT NULL,
--     rating INT,
--     amount INT,
--     section VARCHAR(255),
--     comment TEXT,
--     created_at TIMESTAMP DEFAULT current_timestamp,
--     -- Foreign keys
--     FOREIGN KEY (coaching_area_id) REFERENCES coach_area(id),
--     FOREIGN KEY (coach_id) REFERENCES coach(id),
--     FOREIGN KEY (coachee_id) REFERENCES coachee(id)
-- );
-- DROP TABLE session;
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    coaching_area_id INT NOT NULL,
    coach_id INT NOT NULL,
    coachee_id INT NOT NULL,
    status VARCHAR(255) DEFAULT 'pending',
    payment_status BOOLEAN DEFAULT false,
    date DATE NOT NULL,
    duration INT NOT NULL,
    rating INT,
    amount INT,
    section VARCHAR(255),
    comment TEXT,
    created_at TIMESTAMP DEFAULT current_timestamp,
    accepted_at TIMESTAMP,
    is_session_started BOOLEAN DEFAULT false,
    is_notified BOOLEAN DEFAULT false,
    is_notified_24hr BOOLEAN DEFAULT FALSE,
    session_channel_name VARCHAR(255),
    -- Foreign keys
    FOREIGN KEY (coaching_area_id) REFERENCES coach_area(id) ON DELETE CASCADE,
    FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (coachee_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS rating (
    id SERIAL PRIMARY KEY,
    coachee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coach_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sessions_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    rating DECIMAL(10, 1) NOT NULL,
    comment TEXT,
    badge TEXT DEFAULT "NULL",
    created_at TIMESTAMP DEFAULT NOW (),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS attached_session_duration (
    id SERIAL PRIMARY KEY,
    sessions_id INT REFERENCES sessions(id) ON DELETE CASCADE,
    coachee_id INT REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    duration INT NOT NULL,
    created_at TIMESTAMP DEFAULT current_timestamp
);
CREATE TABLE IF NOT EXISTS country (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL
);
CREATE TABLE IF NOT EXISTS wallets (
    id SERIAL PRIMARY KEY,
    coach_id INT REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    -- Stores the wallet balance
    is_admin BOOLEAN DEFAULT FALSE,
    -- true for admins
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS transactions(
    id SERIAL PRIMARY KEY,
    coach_id INT REFERENCES users(id) ON DELETE CASCADE,
    session_id INT REFERENCES sessions(id) ON DELETE CASCADE,
    coachee_id INT REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    out_going BOOLEAN DEFAULT FALSE,
    -- false means transactions are incoming users paid for the sessions | true means transactions are outgoing users take out the amount
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS admin_transactions(
    id SERIAL PRIMARY KEY,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    out_going BOOLEAN DEFAULT FALSE,
    -- false means transactions are incoming users paid for the sessions | true means transactions are outgoing users take out the amount
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS badges(
    id SERIAL PRIMARY KEY,
    coach_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS notification_type (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    -- ACCEPTED_SESSION | START_SESSION | SESSION_REVIEW  | REQUEST_SESSION | CONFIRM_SESSION
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    is_read_coach BOOLEAN DEFAULT FALSE,
    is_read_coachee BOOLEAN DEFAULT FALSE,
    type TEXT,
    -- SESSION | PAYMENT | BADGES | REVIEWS
    coach_id INT REFERENCES users(id) ON DELETE CASCADE,
    coachee_id INT REFERENCES users(id) ON DELETE CASCADE,
    session_id INT REFERENCES sessions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    senderid INTEGER NOT NULL,
    receiverid INTEGER NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS cards(
    id SERIAL PRIMARY KEY,
    customer_id TEXT,
    card_id TEXT,
    exp_month TEXT,
    exp_year TEXT,
    last_digit TEXT,
    finger_print TEXT,
    brand_name TEXT,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS well_coins(
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    session_id INT REFERENCES sessions(id) ON DELETE CASCADE,
    coins INT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_id UNIQUE (user_id)
);
-- **************************
CREATE TABLE IF NOT EXISTS chats (
    chat_id BIGSERIAL NOT NULL PRIMARY KEY,
    sender_id BIGINT NOT NULL,
    receiver_id BIGINT NOT NULL,
    message TEXT,
    image_url TEXT,
    last_message TEXT,
    last_message_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read BOOLEAN DEFAULT false,
    deleted_by_sender BOOLEAN DEFAULT false,
    deleted_by_receiver BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS user_status (
    user_id BIGINT NOT NULL,
    is_online BOOLEAN DEFAULT false,
    last_online TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS reported_users (
    id BIGSERIAL NOT NULL PRIMARY KEY,
    reported BIGINT NOT NULL,
    reported_by BIGINT NOT NULL,
    reason VARCHAR(255),
    FOREIGN KEY (reported) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS policies (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    type TEXT UNIQUE NOT NULL,
    -- 'privacy' or 'terms'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS session_data_socket (
    id SERIAL PRIMARY KEY,
    -- Use SERIAL for auto-incrementing primary key
    session_id BIGINT UNIQUE NOT NULL,
    coach_started BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS notification_requests (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    type VARCHAR(255),
    coachee_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coachee_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS notification_requests_rating (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    type VARCHAR(255),
    coachee_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coachee_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS notification_requests_payment (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    type VARCHAR(255),
    coachee_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coachee_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS notification_requests_accepted (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    type VARCHAR(255),
    coach_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE
);
-- ALTER TABLE notification_requests ADD COLUMN coachee_id INT REFERENCES users(id) ON DELETE CASCADE;
-- **************************
--  ** triggers
-- DROP TRIGGER IF EXISTS name ON trigger_rating_creation;
-- CREATE OR REPLACE FUNCTION fn_set_coach_completed() RETURNS TRIGGER AS $$ BEGIN -- Check if all required fields are not null and arrays are not empty
--     IF NEW.about IS NOT NULL
--     AND NEW.language_ids <> '{}' -- Check for non-empty array
--     AND NEW.coaching_area_ids <> '{}' -- Check for non-empty array
--     AND NEW.profile_pic IS NOT NULL
--     AND NEW.admin_verified THEN NEW.is_completed := TRUE;
-- ELSE NEW.is_completed := FALSE;
-- -- Ensures is_completed reflects current row state
-- END IF;
-- RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
-- ************
CREATE OR REPLACE TRIGGER tr_set_coach_completed BEFORE
INSERT
    OR
UPDATE ON coach_v2 FOR EACH ROW EXECUTE FUNCTION fn_set_coach_completed();
CREATE OR REPLACE TRIGGER trigger_update_session_status BEFORE
UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_session_status();
CREATE OR REPLACE FUNCTION update_session_status() RETURNS TRIGGER AS $$ BEGIN -- Check if payment_status is false and more than an hour has passed since accepted_at
    IF NEW.status = 'accepted'
    AND NEW.payment_status = false
    AND NEW.accepted_at < NOW() - INTERVAL '1 hour' THEN NEW.status := 'pending';
-- Optionally, log or perform additional actions here
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- coachee badgess
-- Modify the existing trigger function to consider well coins and assign badges
