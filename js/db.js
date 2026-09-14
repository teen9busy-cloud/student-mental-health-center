// ==============================================================================
// 경상남도교육청 학생정신건강 전담센터 - 데이터베이스 어댑터 (Supabase & Local Demo Hybrid)
// ==============================================================================

window.DB = (function() {
  const STORAGE_KEY = "smhc_demo_database_v1";
  let supabaseClient = null;
  let isSupabaseMode = false;

  // Supabase 클라이언트 초기화 시도
  async function initSupabase() {
    const url = window.APP_CONFIG.supabase.url;
    const key = window.APP_CONFIG.supabase.anonKey;
    if (url && key && window.supabase) {
      try {
        supabaseClient = window.supabase.createClient(url, key);
        // Supabase에 smhc_clients 테이블이 있는지 가볍게 확인
        const { data, error } = await supabaseClient.from("smhc_clients").select("id").limit(1);
        if (!error) {
          isSupabaseMode = true;
          console.log("[DB] Supabase 클라우드 모드로 활성화되었습니다:", url);
        } else {
          console.warn("[DB] Supabase 테이블 확인 불가(아직 DDL 미실행 상태일 수 있음). 하이브리드 로컬 모드로 동작합니다:", error.message);
          isSupabaseMode = false;
        }
      } catch (e) {
        console.warn("[DB] Supabase 초기화 실패, 로컬 데모 모드로 동작합니다:", e);
        isSupabaseMode = false;
      }
    } else {
      isSupabaseMode = false;
      console.log("[DB] 로컬 데모 모드로 동작합니다.");
    }

    if (window.UI && window.UI.updateDbStatusBadge) {
      window.UI.updateDbStatusBadge();
    }
    if (isSupabaseMode) {
      if (window.renderDashboard) window.renderDashboard();
      if (window.renderClientsList) window.renderClientsList();
      if (window.renderTestsView) window.renderTestsView();
      if (window.renderMonitoringView) window.renderMonitoringView();
    }
  }

  // 로컬 데모 저장소 로드
  function getLocalData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const init = JSON.parse(JSON.stringify(window.INITIAL_MOCK_DATA));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
      return init;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error("[DB] 로컬 데이터 파싱 실패, 초기화합니다:", e);
      const init = JSON.parse(JSON.stringify(window.INITIAL_MOCK_DATA));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
      return init;
    }
  }

  // 로컬 데모 저장소 쓰기
  function saveLocalData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // 데모 데이터 리셋
  function resetDemoData() {
    const init = JSON.parse(JSON.stringify(window.INITIAL_MOCK_DATA));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
    return init;
  }

  initSupabase();

  return {
    isSupabase: function() {
      return isSupabaseMode;
    },

    getSupabaseClient: function() {
      return supabaseClient;
    },

    setSupabaseConfig: function(url, anonKey) {
      window.APP_CONFIG.supabase.url = url;
      window.APP_CONFIG.supabase.anonKey = anonKey;
      localStorage.setItem("smhc_supabase_url", url);
      localStorage.setItem("smhc_supabase_key", anonKey);
      initSupabase();
    },

    resetToDemoData: function() {
      return resetDemoData();
    },

    // 내담자(학생) 목록 조회
    getClients: async function(filter = {}) {
      let list = null;

      if (isSupabaseMode && supabaseClient) {
        try {
          let query = supabaseClient.from("smhc_clients").select("*").order("created_at", { ascending: false });
          if (filter.center_id && filter.center_id !== "all") query = query.eq("center_id", filter.center_id);
          if (filter.region_id && filter.region_id !== "all") query = query.eq("region_id", filter.region_id);
          if (filter.risk_level && filter.risk_level !== "all") query = query.eq("risk_level", filter.risk_level);
          if (filter.school_level && filter.school_level !== "all") query = query.eq("school_level", filter.school_level);
          const { data, error } = await query;
          if (!error && Array.isArray(data)) {
            list = [...data];
          }
        } catch (err) {
          console.warn("[DB] Supabase 조회 폴백:", err);
        }
      }

      // Supabase 미연결 또는 네트워크 오류 시 Local Demo Mode 사용
      if (list === null) {
        const data = getLocalData();
        list = [...data.students];

        if (filter.center_id && filter.center_id !== "all") {
          list = list.filter(s => s.center_id === filter.center_id);
        }
        if (filter.region_id && filter.region_id !== "all") {
          list = list.filter(s => s.region_id === filter.region_id);
        }
        if (filter.risk_level && filter.risk_level !== "all") {
          list = list.filter(s => s.risk_level === filter.risk_level);
        }
        if (filter.school_level && filter.school_level !== "all") {
          list = list.filter(s => s.school_level === filter.school_level);
        }
      }

      // 키워드 검색 (학생 성명, 식별코드, 학교명, 주호소문제, 담당자 등) - Supabase / Local 공통 완벽 적용
      if (filter.keyword) {
        const kw = filter.keyword.trim().toLowerCase().replace(/\s+/g, "");
        list = list.filter(s => {
          const sName = (s.name || "").toLowerCase().replace(/\s+/g, "");
          const sCode = (s.client_code || "").toLowerCase().replace(/\s+/g, "");
          const sSchool = (s.school_name || "").toLowerCase().replace(/\s+/g, "");
          const sConcern = (s.main_concern || "").toLowerCase().replace(/\s+/g, "");
          const sWorker = (s.assigned_worker || "").toLowerCase().replace(/\s+/g, "");
          const sPsych = (s.assigned_psych || "").toLowerCase().replace(/\s+/g, "");

          if (sName.includes(kw) || sCode.includes(kw) || sSchool.includes(kw) || sConcern.includes(kw) || sWorker.includes(kw) || sPsych.includes(kw)) {
            return true;
          }

          // 학교 축약어 지원 (예: '여고' -> '여자고등', '남고' -> '남자고등', '여중' -> '여자중')
          if (kw.includes("여고") && sSchool.includes("여자고등")) return true;
          if (kw.includes("남고") && sSchool.includes("남자고등")) return true;
          if (kw.includes("여중") && sSchool.includes("여자중")) return true;
          if (kw.includes("남중") && sSchool.includes("남자중")) return true;

          return false;
        });
      }

      return list;
    },

    // 내담자 상세 조회
    getClientById: async function(id) {
      if (isSupabaseMode && supabaseClient) {
        try {
          // UUID 또는 client_code로 조회
          let query = supabaseClient.from("smhc_clients").select("*");
          // id가 UUID 형태인지 확인
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
          if (isUuid) {
            query = query.eq("id", id);
          } else {
            query = query.eq("client_code", id);
          }
          const { data: student, error } = await query.maybeSingle();

          if (!error && student) {
            const { data: tests } = await supabaseClient
              .from("smhc_psych_tests")
              .select("*")
              .or(`client_id.eq.${student.id},client_code.eq.${student.client_code}`)
              .order("test_date", { ascending: false });

            const { data: logs } = await supabaseClient
              .from("smhc_monitoring_logs")
              .select("*")
              .or(`client_id.eq.${student.id},client_name.eq.${student.name}`)
              .order("session_date", { ascending: false });

            return {
              ...student,
              tests: tests || [],
              monitoringLogs: logs || []
            };
          }
        } catch (err) {
          console.warn("[DB] Supabase 상세 조회 폴백:", err);
        }
      }

      // Local Demo Mode 폴백
      const data = getLocalData();
      const student = data.students.find(s => s.id === id || s.client_code === id);
      if (!student) return null;

      const tests = data.tests.filter(t => t.client_id === student.id || t.client_code === student.client_code);
      const logs = data.monitoringLogs.filter(l => l.client_id === student.id || l.client_name === student.name);

      return {
        ...student,
        tests: tests.sort((a, b) => new Date(b.test_date) - new Date(a.test_date)),
        monitoringLogs: logs.sort((a, b) => new Date(b.session_date) - new Date(a.session_date))
      };
    },

    // 학생 등록
    addClient: async function(clientData) {
      const data = getLocalData();
      const newId = "stu-" + String(data.students.length + 1).padStart(3, "0");
      const clientCode = "STU-2026-" + String(data.students.length + 1).padStart(3, "0");

      const record = {
        id: newId,
        client_code: clientCode,
        created_at: new Date().toISOString(),
        risk_level: clientData.risk_level || "NORMAL",
        ...clientData
      };

      if (isSupabaseMode && supabaseClient) {
        try {
          const insertPayload = { ...clientData, client_code: clientCode };
          delete insertPayload.id;
          const { data: inserted, error } = await supabaseClient
            .from("smhc_clients")
            .insert([insertPayload])
            .select()
            .single();
          if (!error && inserted) {
            record.id = inserted.id;
          }
        } catch (e) {
          console.warn("[DB] Supabase 저장 폴백:", e);
        }
      }

      data.students.unshift(record);
      saveLocalData(data);
      return record;
    },

    // 학생 수정
    updateClient: async function(id, updates) {
      if (isSupabaseMode && supabaseClient) {
        try {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
          let q = supabaseClient.from("smhc_clients").update(updates);
          if (isUuid) q = q.eq("id", id);
          else q = q.eq("client_code", id);
          await q;
        } catch(e) {}
      }

      const data = getLocalData();
      const idx = data.students.findIndex(s => s.id === id || s.client_code === id);
      if (idx !== -1) {
        data.students[idx] = { ...data.students[idx], ...updates, updated_at: new Date().toISOString() };
        saveLocalData(data);
      }
      return data.students[idx];
    },

    // 학생 삭제
    deleteClient: async function(id) {
      if (isSupabaseMode && supabaseClient) {
        try {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
          let q = supabaseClient.from("smhc_clients").delete();
          if (isUuid) q = q.eq("id", id);
          else q = q.eq("client_code", id);
          await q;
        } catch(e) {}
      }

      const data = getLocalData();
      data.students = data.students.filter(s => s.id !== id && s.client_code !== id);
      data.tests = data.tests.filter(t => t.client_id !== id && t.client_code !== id);
      data.monitoringLogs = data.monitoringLogs.filter(l => l.client_id !== id);
      saveLocalData(data);
      return true;
    },

    // 심리검사 결과 목록 조회
    getTests: async function(filter = {}) {
      let list = null;

      if (isSupabaseMode && supabaseClient) {
        try {
          let query = supabaseClient.from("smhc_psych_tests").select("*").order("test_date", { ascending: false });
          if (filter.client_id) {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filter.client_id);
            if (isUuid) query = query.eq("client_id", filter.client_id);
            else query = query.eq("client_code", filter.client_id);
          }
          if (filter.test_type) query = query.eq("test_type", filter.test_type);
          if (filter.verdict) query = query.eq("verdict", filter.verdict);
          const { data, error } = await query;
          if (!error && Array.isArray(data)) {
            list = [...data];
          }
        } catch (err) {
          console.warn("[DB] Supabase 조회 폴백:", err);
        }
      }

      if (list === null) {
        const data = getLocalData();
        list = [...data.tests];
        if (filter.client_id) list = list.filter(t => t.client_id === filter.client_id || t.client_code === filter.client_id);
        if (filter.test_type) list = list.filter(t => t.test_type === filter.test_type);
        if (filter.verdict) list = list.filter(t => t.verdict === filter.verdict);
      }

      if (filter.keyword) {
        const kw = filter.keyword.trim().toLowerCase();
        list = list.filter(t =>
          (t.client_name && t.client_name.toLowerCase().includes(kw)) ||
          (t.client_code && t.client_code.toLowerCase().includes(kw)) ||
          (t.summary_opinion && t.summary_opinion.toLowerCase().includes(kw))
        );
      }

      return list.sort((a, b) => new Date(b.test_date) - new Date(a.test_date));
    },

    // 심리검사 결과 추가
    addTest: async function(testData) {
      const data = getLocalData();
      const newId = "t-" + String(data.tests.length + 1).padStart(3, "0");
      const record = {
        id: newId,
        created_at: new Date().toISOString(),
        ...testData
      };

      if (isSupabaseMode && supabaseClient) {
        try {
          const insertPayload = { ...testData };
          delete insertPayload.id;
          delete insertPayload.riskLevel;
          // client_id가 UUID가 아니면 null 처리하고 client_code로 유지
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(insertPayload.client_id);
          if (!isUuid) delete insertPayload.client_id;
          const { data: inserted, error } = await supabaseClient
            .from("smhc_psych_tests")
            .insert([insertPayload])
            .select()
            .single();
          if (!error && inserted) {
            record.id = inserted.id;
          }
        } catch (e) {
          console.warn("[DB] Supabase 검사 저장 폴백:", e);
        }
      }

      data.tests.unshift(record);
      saveLocalData(data);
      return record;
    },

    // 심리검사 일괄 추가
    bulkAddTests: async function(records) {
      const data = getLocalData();
      const created = [];
      for (const rec of records) {
        const newId = "t-" + String(data.tests.length + 1).padStart(3, "0");
        const item = {
          id: newId,
          created_at: new Date().toISOString(),
          ...rec
        };
        data.tests.unshift(item);
        created.push(item);
      }
      saveLocalData(data);

      if (isSupabaseMode && supabaseClient) {
        try {
          await supabaseClient.from("smhc_psych_tests").insert(created);
        } catch (e) {
          console.warn("[DB] Supabase 일괄 저장 폴백:", e);
        }
      }

      return created;
    },

    // 모니터링 일지 목록
    getMonitoringLogs: async function(filter = {}) {
      let list = null;

      if (isSupabaseMode && supabaseClient) {
        try {
          let query = supabaseClient.from("smhc_monitoring_logs").select("*").order("session_date", { ascending: false });
          if (filter.client_id) query = query.eq("client_id", filter.client_id);
          const { data, error } = await query;
          if (!error && Array.isArray(data)) {
            list = [...data];
          }
        } catch (err) {
          console.warn("[DB] Supabase 조회 폴백:", err);
        }
      }

      if (list === null) {
        const data = getLocalData();
        list = [...data.monitoringLogs];
        if (filter.client_id) list = list.filter(l => l.client_id === filter.client_id);
      }

      return list.sort((a, b) => new Date(b.session_date) - new Date(a.session_date));
    },

    // 모니터링 일지 작성
    addMonitoringLog: async function(logData) {
      const data = getLocalData();
      const newId = "log-" + String(data.monitoringLogs.length + 1).padStart(3, "0");
      const record = {
        id: newId,
        created_at: new Date().toISOString(),
        ...logData
      };

      if (isSupabaseMode && supabaseClient) {
        try {
          const insertPayload = { ...logData };
          delete insertPayload.id;
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(insertPayload.client_id);
          if (!isUuid) delete insertPayload.client_id;
          const { data: inserted, error } = await supabaseClient
            .from("smhc_monitoring_logs")
            .insert([insertPayload])
            .select()
            .single();
          if (!error && inserted) {
            record.id = inserted.id;
          }
        } catch (e) {
          console.warn("[DB] Supabase 모니터링 저장 폴백:", e);
        }
      }

      data.monitoringLogs.unshift(record);
      saveLocalData(data);
      return record;
    },

    // 종합 통계 산출
    getAggregatedStats: async function(centerId = "all") {
      const students = await this.getClients(centerId !== "all" ? { center_id: centerId } : {});
      const tests = await this.getTests();
      const logs = await this.getMonitoringLogs();

      const totalStudents = students.length;
      const severeCount = students.filter(s => s.risk_level === "SEVERE").length;
      const moderateCount = students.filter(s => s.risk_level === "MODERATE").length;
      const mildCount = students.filter(s => s.risk_level === "MILD").length;
      const normalCount = students.filter(s => s.risk_level === "NORMAL").length;

      const regionDistribution = {};
      window.APP_CONFIG.regions.forEach(r => {
        if (centerId === "all" || r.centerId === centerId) {
          regionDistribution[r.name] = 0;
        }
      });
      students.forEach(s => {
        const reg = window.APP_CONFIG.regions.find(r => r.id === s.region_id);
        if (reg && regionDistribution[reg.name] !== undefined) {
          regionDistribution[reg.name]++;
        }
      });

      const schoolLevelStats = { 초등학교: 0, 중학교: 0, 고등학교: 0, 기타: 0 };
      students.forEach(s => {
        if (schoolLevelStats[s.school_level] !== undefined) {
          schoolLevelStats[s.school_level]++;
        } else {
          schoolLevelStats["기타"]++;
        }
      });

      const concernStats = {};
      students.forEach(s => {
        const c = s.main_concern || "기타";
        concernStats[c] = (concernStats[c] || 0) + 1;
      });

      return {
        totalStudents,
        riskDistribution: {
          severe: severeCount,
          moderate: moderateCount,
          mild: mildCount,
          normal: normalCount
        },
        regionDistribution,
        schoolLevelStats,
        concernStats,
        totalTests: tests.length,
        totalLogs: logs.length
      };
    }
  };
})();
