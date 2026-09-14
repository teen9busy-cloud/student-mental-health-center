-- ==============================================================================
-- 경상남도교육청 학생정신건강 전담센터 웹 플랫폼 (Student Mental Health Center)
-- PostgreSQL / Supabase Schema DDL
-- ==============================================================================

-- 1. 전담센터 정보 (진주 경상국립대병원 / 창원 경상국립대병원)
CREATE TABLE IF NOT EXISTS centers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    hospital_name VARCHAR(100) NOT NULL,
    region_scope VARCHAR(50) NOT NULL, -- '서부경남', '동부경남'
    address TEXT,
    phone VARCHAR(30),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. 경상남도 관할 18개 시·군 지역 테이블
CREATE TABLE IF NOT EXISTS regions (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    center_id VARCHAR(50) REFERENCES centers(id) ON DELETE SET NULL,
    office_of_education VARCHAR(100) NOT NULL,
    sort_order INT DEFAULT 0
);

-- 3. 시스템 사용자 (센터장/의사, 임상심리사, 사회복지사, 교육청 관리자)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID,
    center_id VARCHAR(50) REFERENCES centers(id),
    name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(30) NOT NULL, -- 'DIRECTOR', 'PSYCHOLOGIST', 'SOCIAL_WORKER', 'ADMIN', 'VIEWER'
    license_type VARCHAR(100),
    phone VARCHAR(30),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. 학생(내담자) 기본 정보
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_code VARCHAR(30) UNIQUE NOT NULL, -- 가명 식별코드: STU-2026-001 (개인정보 보호)
    center_id VARCHAR(50) REFERENCES centers(id) NOT NULL,
    region_id VARCHAR(20) REFERENCES regions(id) NOT NULL,
    name VARCHAR(50) NOT NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('남', '여')),
    birth_date DATE,
    school_level VARCHAR(20) NOT NULL CHECK (school_level IN ('초등학교', '중학교', '고등학교', '특수학교', '기타')),
    school_name VARCHAR(100) NOT NULL,
    grade INT NOT NULL,
    class_room VARCHAR(20),
    parent_relation VARCHAR(30),
    parent_contact VARCHAR(30),
    referral_source VARCHAR(50) NOT NULL, -- 'Wee클래스', 'Wee센터', '담임교사', '학부모 직접', '병원 연계', '기타'
    main_concern VARCHAR(50) NOT NULL, -- '우울/무기력', '불안/공황', '자해/자살위기', '학교폭력/대인관계', '주의집중/ADHD', '품행/반항', '학업스트레스', '기타'
    risk_level VARCHAR(20) DEFAULT 'NORMAL' CHECK (risk_level IN ('NORMAL', 'MILD', 'MODERATE', 'SEVERE')), -- 일반, 관심, 주의, 고위험
    assigned_worker_id UUID REFERENCES users(id),
    assigned_psych_id UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. 심리검사 레코드 (Psychological Tests)
CREATE TABLE IF NOT EXISTS psych_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
    test_type VARCHAR(50) NOT NULL, -- 'AMPQ_II', 'K_BDI_II', 'RCMAS', 'STAI', 'C_SSRS', 'K_CBCL'
    test_date DATE NOT NULL,
    examiner_id UUID REFERENCES users(id),
    total_score NUMERIC(6, 2),
    t_score NUMERIC(6, 2),
    percentile NUMERIC(6, 2),
    verdict VARCHAR(30) NOT NULL, -- 'NORMAL', 'ATTENTION', 'HIGH_RISK'
    subscale_scores JSONB DEFAULT '{}'::jsonb,
    file_name VARCHAR(255),
    summary_opinion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. 모니터링 및 상담 일지 (Monitoring & Case Notes)
CREATE TABLE IF NOT EXISTS monitoring_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
    worker_id UUID REFERENCES users(id) NOT NULL,
    session_date DATE NOT NULL,
    session_no INT DEFAULT 1,
    contact_type VARCHAR(30) NOT NULL, -- 'FACE_TO_FACE', 'PHONE', 'VISIT_SCHOOL', 'VISIT_HOME', 'HOSPITAL_LINK'
    current_risk VARCHAR(20) NOT NULL,
    session_summary TEXT NOT NULL,
    student_status TEXT,
    intervention_details TEXT,
    doctor_opinion TEXT,
    next_schedule DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. 시스템 감사 로그 (Audit Logs)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(50) NOT NULL,
    target_table VARCHAR(50) NOT NULL,
    target_id VARCHAR(100),
    ip_address VARCHAR(50),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 초기 기본 전담센터 데이터 삽입
INSERT INTO centers (id, name, hospital_name, region_scope, address, phone) VALUES
('jinju', '진주 경상국립대학교병원 학생정신건강 전담센터', '경상국립대학교병원(진주 본원)', '서부경남', '경남 진주시 강남로 79', '055-750-8000'),
('changwon', '창원 경상국립대학교병원 학생정신건강 전담센터', '창원경상국립대학교병원', '동부경남', '경남 창원시 성산구 삼정자로 11', '055-214-1000')
ON CONFLICT (id) DO NOTHING;

-- 초기 경남 18개 시·군 지역 데이터 삽입
INSERT INTO regions (id, name, center_id, office_of_education, sort_order) VALUES
('jinju', '진주시', 'jinju', '진주교육지원청', 1),
('sacheon', '사천시', 'jinju', '사천교육지원청', 2),
('tongyeong', '통영시', 'jinju', '통영교육지원청', 3),
('geoje', '거제시', 'jinju', '거제교육지원청', 4),
('goseong', '고성군', 'jinju', '고성교육지원청', 5),
('namhae', '남해군', 'jinju', '남해교육지원청', 6),
('hadong', '하동군', 'jinju', '하동교육지원청', 7),
('sancheong', '산청군', 'jinju', '산청교육지원청', 8),
('hamyang', '함양군', 'jinju', '함양교육지원청', 9),
('geochang', '거창군', 'jinju', '거창교육지원청', 10),
('hapcheon', '합천군', 'jinju', '합천교육지원청', 11),
('changwon', '창원시', 'changwon', '창원교육지원청', 12),
('gimhae', '김해시', 'changwon', '김해교육지원청', 13),
('yangsan', '양산시', 'changwon', '양산교육지원청', 14),
('miryang', '밀양시', 'changwon', '밀양교육지원청', 15),
('uiryeong', '의령군', 'changwon', '의령교육지원청', 16),
('haman', '함안군', 'changwon', '함안교육지원청', 17),
('changnyeong', '창녕군', 'changwon', '창녕교육지원청', 18)
ON CONFLICT (id) DO NOTHING;
