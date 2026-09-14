// ==============================================================================
// 경상남도교육청 학생정신건강 전담센터 플랫폼 - 설정 및 메타데이터
// ==============================================================================

window.APP_CONFIG = {
  appName: "경남 학생정신건강 전담센터 통합관리 플랫폼",
  version: "1.0.0 (Demo)",
  
  // Supabase 클라우드 설정 (새로 생성된 student-mental-health 전용 프로젝트)
  supabase: {
    url: "https://ozgosuxpdzcbzyxkldwa.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96Z29zdXhwZHpjYnp5eGtsZHdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMzgzMjMsImV4cCI6MjEwNDkxNDMyM30.-6zzF595EpZ7gXvQJNL1_b9FsX96bPhyg0RIuKOhQ8U"
  },

  // 전담센터 정의
  centers: [
    {
      id: "jinju",
      name: "진주 경상국립대학교병원 학생정신건강 전담센터",
      hospital: "경상국립대학교병원 (진주 본원)",
      scope: "서부경남 (11개 시·군)",
      phone: "055-750-8000"
    },
    {
      id: "changwon",
      name: "창원 경상국립대학교병원 학생정신건강 전담센터",
      hospital: "창원경상국립대학교병원",
      scope: "동부경남 (7개 시·군)",
      phone: "055-214-1000"
    }
  ],

  // 경상남도 18개 시·군 지역 및 관할 센터 매핑
  regions: [
    { id: "jinju", name: "진주시", centerId: "jinju", office: "진주교육지원청" },
    { id: "sacheon", name: "사천시", centerId: "jinju", office: "사천교육지원청" },
    { id: "tongyeong", name: "통영시", centerId: "jinju", office: "통영교육지원청" },
    { id: "geoje", name: "거제시", centerId: "jinju", office: "거제교육지원청" },
    { id: "goseong", name: "고성군", centerId: "jinju", office: "고성교육지원청" },
    { id: "namhae", name: "남해군", centerId: "jinju", office: "남해교육지원청" },
    { id: "hadong", name: "하동군", centerId: "jinju", office: "하동교육지원청" },
    { id: "sancheong", name: "산청군", centerId: "jinju", office: "산청교육지원청" },
    { id: "hamyang", name: "함양군", centerId: "jinju", office: "함양교육지원청" },
    { id: "geochang", name: "거창군", centerId: "jinju", office: "거창교육지원청" },
    { id: "hapcheon", name: "합천군", centerId: "jinju", office: "합천교육지원청" },
    { id: "changwon", name: "창원시", centerId: "changwon", office: "창원교육지원청" },
    { id: "gimhae", name: "김해시", centerId: "changwon", office: "김해교육지원청" },
    { id: "yangsan", name: "양산시", centerId: "changwon", office: "양산교육지원청" },
    { id: "miryang", name: "밀양시", centerId: "changwon", office: "밀양교육지원청" },
    { id: "uiryeong", name: "의령군", centerId: "changwon", office: "의령교육지원청" },
    { id: "haman", name: "함안군", centerId: "changwon", office: "함안교육지원청" },
    { id: "changnyeong", name: "창녕군", centerId: "changwon", office: "창녕교육지원청" }
  ],

  // 사용자 역할 (데모 스위처용)
  demoRoles: [
    {
      id: "dr_kim",
      role: "DIRECTOR",
      name: "김진우 센터장 (소아청소년정신과 전문의)",
      centerId: "jinju",
      label: "센터장(의사) 모드"
    },
    {
      id: "psych_park",
      role: "PSYCHOLOGIST",
      name: "박서연 임상심리사 (1급 정신건강임상심리사)",
      centerId: "jinju",
      label: "임상심리사 모드"
    },
    {
      id: "social_lee",
      role: "SOCIAL_WORKER",
      name: "이민호 사회복지사 (1급 정신건강사회복지사)",
      centerId: "jinju",
      label: "사회복지사 모드"
    },
    {
      id: "admin_edu",
      role: "VIEWER",
      name: "정재훈 장학사 (경남교육청 교육복지과)",
      centerId: "all",
      label: "교육청(장학사) 모드"
    }
  ],

  // 위기도 레벨
  riskLevels: {
    NORMAL: { label: "일반군", badgeClass: "badge-normal", color: "#2e7d32", desc: "정서행동 양호" },
    MILD: { label: "관심군", badgeClass: "badge-mild", color: "#1976d2", desc: "지속적 관심 필요" },
    MODERATE: { label: "주의군", badgeClass: "badge-moderate", color: "#ed6c02", desc: "전문상담 개입 필요" },
    SEVERE: { label: "고위험군 (위기)", badgeClass: "badge-severe", color: "#d32f2f", desc: "즉각 위기개입/병원진료" }
  },

  // 심리검사 척도 정의 및 컷오프(절단점)
  testTypes: {
    AMPQ_II: {
      name: "학생정서·행동특성 2차 심층검사 (AMPQ-II)",
      maxScore: 65,
      unit: "점",
      subscales: [
        { key: "depression", name: "우울", max: 15 },
        { key: "anxiety", name: "불안", max: 15 },
        { key: "conduct", name: "품행/공격성", max: 15 },
        { key: "deliberation", name: "자살/자해생각", max: 20 }
      ],
      evaluate: function(score, subscales) {
        if (subscales && subscales.deliberation >= 4) {
          return { verdict: "HIGH_RISK", label: "고위험(위기군)", riskLevel: "SEVERE" };
        }
        if (score >= 32) return { verdict: "HIGH_RISK", label: "고위험(위기군)", riskLevel: "SEVERE" };
        if (score >= 21) return { verdict: "ATTENTION", label: "우선관리군(주의)", riskLevel: "MODERATE" };
        if (score >= 15) return { verdict: "ATTENTION", label: "관심군", riskLevel: "MILD" };
        return { verdict: "NORMAL", label: "일반군(정상)", riskLevel: "NORMAL" };
      }
    },
    K_BDI_II: {
      name: "한국판 청소년 우울척도 (K-BDI-II)",
      maxScore: 63,
      unit: "점",
      evaluate: function(score) {
        if (score >= 29) return { verdict: "HIGH_RISK", label: "심각한 우울 (고위험)", riskLevel: "SEVERE" };
        if (score >= 20) return { verdict: "HIGH_RISK", label: "중등도 우울 (주의)", riskLevel: "MODERATE" };
        if (score >= 14) return { verdict: "ATTENTION", label: "가벼운 우울 (관심)", riskLevel: "MILD" };
        return { verdict: "NORMAL", label: "정상 (우울 없음)", riskLevel: "NORMAL" };
      }
    },
    RCMAS: {
      name: "아동·청소년 개정판 다면인성불안척도 (RCMAS)",
      maxScore: 28,
      unit: "점",
      evaluate: function(score) {
        if (score >= 19) return { verdict: "HIGH_RISK", label: "고불안 (고위험)", riskLevel: "SEVERE" };
        if (score >= 13) return { verdict: "ATTENTION", label: "주의 불안", riskLevel: "MODERATE" };
        return { verdict: "NORMAL", label: "정상 범위", riskLevel: "NORMAL" };
      }
    },
    C_SSRS: {
      name: "콜롬비아 자살위험도 평가척도 (C-SSRS)",
      maxScore: 10,
      unit: "점 (위험단계 0~5)",
      evaluate: function(score) {
        if (score >= 4) return { verdict: "HIGH_RISK", label: "긴급 위기 (자살시도/구체적 계획)", riskLevel: "SEVERE" };
        if (score >= 2) return { verdict: "HIGH_RISK", label: "잠재적 위기 (자살사고/방법 고민)", riskLevel: "MODERATE" };
        if (score >= 1) return { verdict: "ATTENTION", label: "수동적 소망/죽고싶은 생각", riskLevel: "MILD" };
        return { verdict: "NORMAL", label: "위험 징후 없음", riskLevel: "NORMAL" };
      }
    },
    K_CBCL: {
      name: "아동·청소년 행동평가척도 (K-CBCL T점수)",
      maxScore: 100,
      unit: "T점수",
      evaluate: function(score) {
        if (score >= 70) return { verdict: "HIGH_RISK", label: "임상 범위 (T>=70)", riskLevel: "SEVERE" };
        if (score >= 65) return { verdict: "ATTENTION", label: "준임상 범위 (65<=T<70)", riskLevel: "MODERATE" };
        return { verdict: "NORMAL", label: "정상 범위 (T<65)", riskLevel: "NORMAL" };
      }
    },
    MMPI_2: {
      name: "마음사랑 다면적 인성검사 (MMPI-2)",
      maxScore: 120,
      unit: "T점수",
      subscales: [
        { key: "Hs", name: "1. 건강염려증 (Hs)", max: 120 },
        { key: "D", name: "2. 우울증 (D)", max: 120 },
        { key: "Hy", name: "3. 히스테리 (Hy)", max: 120 },
        { key: "Pd", name: "4. 반사회성 (Pd)", max: 120 },
        { key: "Mf", name: "5. 남성성-여성성 (Mf)", max: 120 },
        { key: "Pa", name: "6. 편집증 (Pa)", max: 120 },
        { key: "Pt", name: "7. 강박증/불안 (Pt)", max: 120 },
        { key: "Sc", name: "8. 조현증 (Sc)", max: 120 },
        { key: "Ma", name: "9. 경조증 (Ma)", max: 120 },
        { key: "Si", name: "0. 사회적 내향성 (Si)", max: 120 }
      ],
      evaluate: function(score, subscales) {
        let maxSub = score;
        if (subscales) {
          const vals = Object.values(subscales).map(v => parseFloat(v) || 0);
          if (vals.length > 0) maxSub = Math.max(...vals);
        }
        if (maxSub >= 70) return { verdict: "HIGH_RISK", label: "임상적 유의 수준 (T>=70)", riskLevel: "SEVERE" };
        if (maxSub >= 65) return { verdict: "ATTENTION", label: "경계선/주의 수준 (T>=65)", riskLevel: "MODERATE" };
        return { verdict: "NORMAL", label: "정상 범위 (T<65)", riskLevel: "NORMAL" };
      }
    },
    MMPI_A: {
      name: "청소년 다면적 인성검사 (MMPI-A)",
      maxScore: 120,
      unit: "T점수",
      subscales: [
        { key: "Hs", name: "1. 건강염려증 (Hs)", max: 120 },
        { key: "D", name: "2. 우울증 (D)", max: 120 },
        { key: "Hy", name: "3. 히스테리 (Hy)", max: 120 },
        { key: "Pd", name: "4. 반사회성 (Pd)", max: 120 },
        { key: "Mf", name: "5. 남성성-여성성 (Mf)", max: 120 },
        { key: "Pa", name: "6. 편집증 (Pa)", max: 120 },
        { key: "Pt", name: "7. 강박증/불안 (Pt)", max: 120 },
        { key: "Sc", name: "8. 조현증 (Sc)", max: 120 },
        { key: "Ma", name: "9. 경조증 (Ma)", max: 120 },
        { key: "Si", name: "0. 사회적 내향성 (Si)", max: 120 }
      ],
      evaluate: function(score, subscales) {
        let maxSub = score;
        if (subscales) {
          const vals = Object.values(subscales).map(v => parseFloat(v) || 0);
          if (vals.length > 0) maxSub = Math.max(...vals);
        }
        if (maxSub >= 70) return { verdict: "HIGH_RISK", label: "임상적 유의 수준 (T>=70)", riskLevel: "SEVERE" };
        if (maxSub >= 65) return { verdict: "ATTENTION", label: "경계선/주의 수준 (T>=65)", riskLevel: "MODERATE" };
        return { verdict: "NORMAL", label: "정상 범위 (T<65)", riskLevel: "NORMAL" };
      }
    }
  },

  schoolLevels: ["초등학교", "중학교", "고등학교", "특수학교"],
  referralSources: [
    "Wee클래스(학교)",
    "Wee센터(교육지원청)",
    "담임교사",
    "학부모 직접의뢰",
    "병원 소아청소년과 연계",
    "기타"
  ],
  concernCategories: [
    "우울/무기력",
    "불안/공황/사회불안",
    "자해/자살위기",
    "학교폭력/대인관계 갈등",
    "주의집중(ADHD)/충동성",
    "품행문제/등교거부",
    "학업 및 진로 스트레스",
    "가정불화/정서적 방임"
  ],
  contactTypes: {
    FACE_TO_FACE: { label: "센터 대면상담", icon: "👤" },
    PHONE: { label: "전화/화상 모니터링", icon: "📞" },
    VISIT_SCHOOL: { label: "학교 방문(Wee클래스 연계)", icon: "🏫" },
    VISIT_HOME: { label: "가정 방문", icon: "🏠" },
    HOSPITAL_LINK: { label: "병원 외래 진료 연계", icon: "🏥" }
  }
};
