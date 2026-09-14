// ==============================================================================
// 경상남도교육청 학생정신건강 전담센터 - 내담자(학생) 관리 모듈
// ==============================================================================

(function() {
  let selectedStudentId = null;

  // 학생 목록 렌더링
  async function renderClientsList() {
    const tbody = document.getElementById("clientsTableBody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted)">데이터를 불러오는 중입니다...</td></tr>`;

    const centerFilter = document.getElementById("filterCenter") ? document.getElementById("filterCenter").value : "all";
    const regionFilter = document.getElementById("filterRegion") ? document.getElementById("filterRegion").value : "all";
    const riskFilter = document.getElementById("filterRisk") ? document.getElementById("filterRisk").value : "all";
    const schoolFilter = document.getElementById("filterSchool") ? document.getElementById("filterSchool").value : "all";
    const keyword = document.getElementById("searchClientKeyword") ? document.getElementById("searchClientKeyword").value : "";

    const students = await window.DB.getClients({
      center_id: centerFilter,
      region_id: regionFilter,
      risk_level: riskFilter,
      school_level: schoolFilter,
      keyword: keyword
    });

    const countElem = document.getElementById("clientsTotalCount");
    if (countElem) countElem.textContent = `${students.length}명`;

    if (students.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-sub)">조건에 해당하는 학생(내담자)이 없습니다.</td></tr>`;
      return;
    }

    tbody.innerHTML = students.map(s => {
      const reg = window.APP_CONFIG.regions.find(r => r.id === s.region_id);
      const regionName = reg ? reg.name : s.region_id;
      const centerName = s.center_id === "jinju" ? "진주(서부)" : "창원(동부)";
      const riskBadge = window.UI.renderRiskBadge(s.risk_level);

      const isEdu = window.UI.getCurrentRole().role === "VIEWER";
      let displayName = s.name;
      if (isEdu && displayName.length >= 2) {
        displayName = displayName[0] + "*" + (displayName.length > 2 ? displayName.slice(2) : "");
      }

      return `
        <tr>
          <td><strong style="color:var(--primary)">${s.client_code}</strong></td>
          <td><strong>${displayName}</strong> (${s.gender})</td>
          <td>${regionName} / <span style="font-size:12px;color:var(--text-sub)">${centerName}</span></td>
          <td>${s.school_name} (${s.grade}학년)</td>
          <td><span style="font-size:13px;background:#f1f5f9;padding:3px 8px;border-radius:4px">${s.main_concern}</span></td>
          <td>${s.referral_source}</td>
          <td>${riskBadge}</td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="window.viewStudentDetail('${s.id}')">상세/기록</button>
          </td>
        </tr>
      `;
    }).join("");
  }

  // 학생 상세 모달 열기
  async function viewStudentDetail(id) {
    selectedStudentId = id;
    const student = await window.DB.getClientById(id);
    if (!student) {
      window.UI.showToast("학생 정보를 찾을 수 없습니다.", "error");
      return;
    }

    const reg = window.APP_CONFIG.regions.find(r => r.id === student.region_id);
    const center = window.APP_CONFIG.centers.find(c => c.id === student.center_id);

    // 모달 데이터 채우기
    document.getElementById("detailStudentCode").textContent = student.client_code;
    document.getElementById("detailStudentName").textContent = `${student.name} (${student.gender}, ${student.birth_date || "생일미기재"})`;
    document.getElementById("detailStudentSchool").textContent = `${student.school_name} ${student.grade}학년 ${student.class_room || ""}`;
    document.getElementById("detailStudentRegion").textContent = `${reg ? reg.name : ""} (${center ? center.name : ""})`;
    document.getElementById("detailStudentRisk").innerHTML = window.UI.renderRiskBadge(student.risk_level);
    document.getElementById("detailStudentReferral").textContent = `${student.referral_source} / 주호소: ${student.main_concern}`;
    document.getElementById("detailStudentParent").textContent = `${student.parent_relation || "보호자"}: ${student.parent_contact || "연락처 미등록"}`;
    document.getElementById("detailStudentWorkers").textContent = `담당 사회복지사: ${student.assigned_worker || "미정"} | 담당 임상심리사: ${student.assigned_psych || "미정"}`;
    document.getElementById("detailStudentNotes").textContent = student.notes || "특이사항 없음";

    // 심리검사 내역 렌더링
    const testListEl = document.getElementById("detailTestList");
    if (testListEl) {
      if (!student.tests || student.tests.length === 0) {
        testListEl.innerHTML = `<div style="text-align:center;padding:16px;color:var(--text-sub);background:#f8fafc;border-radius:6px">등록된 심리검사 내역이 없습니다.</div>`;
      } else {
        testListEl.innerHTML = student.tests.map(t => {
          const testDef = window.APP_CONFIG.testTypes[t.test_type];
          const testName = testDef ? testDef.name : t.test_type;
          return `
            <div style="background:#fff;border:1px solid var(--line);border-radius:8px;padding:12px 16px;margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <strong style="font-size:14.5px">${testName}</strong>
                <div>
                  <span style="font-size:12.5px;color:var(--text-sub);margin-right:8px">${t.test_date}</span>
                  ${window.UI.renderVerdictBadge(t.verdict)}
                </div>
              </div>
              <div style="font-size:13.5px;color:var(--text-main);margin-bottom:4px">
                총점: <strong>${t.total_score}점</strong> ${t.t_score ? `(T점수: ${t.t_score})` : ""} | 실시자: ${t.examiner || "미기재"}
              </div>
              ${t.summary_opinion ? `<div style="font-size:13px;background:#f8fafc;padding:8px 10px;border-radius:4px;color:var(--text-sub);border-left:3px solid var(--primary)">${t.summary_opinion}</div>` : ""}
            </div>
          `;
        }).join("");
      }
    }

    // 모니터링 상담 일지 렌더링
    const logListEl = document.getElementById("detailLogList");
    if (logListEl) {
      if (!student.monitoringLogs || student.monitoringLogs.length === 0) {
        logListEl.innerHTML = `<div style="text-align:center;padding:16px;color:var(--text-sub);background:#f8fafc;border-radius:6px">등록된 모니터링 상담 일지가 없습니다.</div>`;
      } else {
        logListEl.innerHTML = `
          <div class="timeline">
            ${student.monitoringLogs.map(l => {
              const cType = window.APP_CONFIG.contactTypes[l.contact_type] || { label: l.contact_type, icon: "📝" };
              return `
                <div class="timeline-item">
                  <div class="timeline-dot"></div>
                  <div class="timeline-content">
                    <div class="timeline-header">
                      <strong>${cType.icon} ${cType.label} (제${l.session_no || 1}회기) - ${l.session_date}</strong>
                      <span>작성: ${l.worker}</span>
                    </div>
                    <div style="font-size:13.5px;font-weight:600;margin-bottom:4px">${l.session_summary}</div>
                    ${l.student_status ? `<div style="font-size:13px;color:var(--text-sub);margin-bottom:4px"><strong>상태:</strong> ${l.student_status}</div>` : ""}
                    ${l.intervention_details ? `<div style="font-size:13px;color:var(--text-sub);margin-bottom:6px"><strong>개입:</strong> ${l.intervention_details}</div>` : ""}
                    ${l.doctor_opinion ? `<div style="font-size:13px;background:#eff6ff;color:#1e40af;padding:8px 10px;border-radius:4px;border:1px solid #bfdbfe;margin-top:6px"><strong>전문의 자문:</strong> ${l.doctor_opinion}</div>` : ""}
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        `;
      }
    }

    // 센터장(전문의) 전용 자문 박스 표시 제어
    const consultBox = document.getElementById("doctorConsultationBox");
    if (consultBox) {
      const isDoctor = window.UI.getCurrentRole().role === "DIRECTOR";
      consultBox.style.display = isDoctor ? "block" : "none";
    }

    window.UI.openModal("modalStudentDetail");
  }

  // 센터장(의사) 모드에서 학생 상세창의 전문의 자문 소견 저장
  async function saveDoctorOpinion() {
    if (!selectedStudentId) return;
    const inputEl = document.getElementById("doctorOpinionInput");
    const opinionText = inputEl ? inputEl.value.trim() : "";
    if (!opinionText) {
      window.UI.showToast("전문의 자문 소견 내용을 입력해 주세요.", "warn");
      return;
    }

    const student = await window.DB.getClientById(selectedStudentId);
    if (!student) return;

    const newLog = {
      client_id: student.id,
      client_name: student.name,
      session_date: new Date().toISOString().split("T")[0],
      session_no: (student.monitoringLogs ? student.monitoringLogs.length : 0) + 1,
      contact_type: "HOSPITAL_LINK",
      current_risk: student.risk_level,
      worker: window.UI.getCurrentRole().name,
      session_summary: "[소아청소년정신과 전문의 자문 결재 완료]",
      student_status: "전문의 종합 임상 진단 검토 완료",
      intervention_details: "병원 외래 진료 연계 및 맞춤형 집중 모니터링 승인",
      doctor_opinion: opinionText
    };

    try {
      await window.DB.addMonitoringLog(newLog);
      window.UI.showToast("전문의 자문 소견이 Supabase DB에 성공적으로 결재 등록되었습니다!", "success");
      inputEl.value = "";
      viewStudentDetail(selectedStudentId);
      if (window.renderDashboard) window.renderDashboard();
    } catch(e) {
      console.error(e);
      window.UI.showToast("자문 저장 중 오류가 발생했습니다.", "error");
    }
  }

  // 신규 학생 등록 저장
  async function handleCreateStudent(e) {
    e.preventDefault();
    const form = e.target;

    const studentData = {
      name: form.studentName.value.trim(),
      gender: form.studentGender.value,
      birth_date: form.studentBirthDate.value || null,
      center_id: form.studentCenter.value,
      region_id: form.studentRegion.value,
      school_level: form.studentSchoolLevel.value,
      school_name: form.studentSchoolName.value.trim(),
      grade: parseInt(form.studentGrade.value, 10) || 1,
      class_room: form.studentClassRoom.value.trim(),
      parent_relation: form.studentParentRelation.value.trim(),
      parent_contact: form.studentParentContact.value.trim(),
      referral_source: form.studentReferralSource.value,
      main_concern: form.studentMainConcern.value,
      risk_level: form.studentRiskLevel.value,
      assigned_worker: form.studentWorker.value.trim() || "이민호 사회복지사",
      assigned_psych: form.studentPsych.value.trim() || "박서연 임상심리사",
      notes: form.studentNotes.value.trim()
    };

    if (!studentData.name || !studentData.school_name) {
      window.UI.showToast("학생 이름과 학교명을 입력해 주세요.", "warn");
      return;
    }

    try {
      const created = await window.DB.addClient(studentData);
      window.UI.showToast(`학생 [${created.name}] (${created.client_code}) 등록이 완료되었습니다.`, "success");
      form.reset();
      window.UI.closeModal("modalNewStudent");
      renderClientsList();
      if (window.renderDashboard) window.renderDashboard();
    } catch (err) {
      console.error(err);
      window.UI.showToast("학생 등록 중 오류가 발생했습니다.", "error");
    }
  }

  // 상세 모달에서 바로 검사 추가 모달 열기
  function openAddTestForCurrentStudent() {
    if (!selectedStudentId) return;
    window.UI.closeModal("modalStudentDetail");
    window.UI.switchTab("tests");
    setTimeout(() => {
      const select = document.getElementById("newTestStudentSelect");
      if (select) select.value = selectedStudentId;
      window.UI.openModal("modalNewTest");
    }, 200);
  }

  // 상세 모달에서 바로 모니터링 추가 모달 열기
  function openAddLogForCurrentStudent() {
    if (!selectedStudentId) return;
    window.UI.closeModal("modalStudentDetail");
    window.UI.switchTab("monitoring");
    setTimeout(() => {
      const select = document.getElementById("newLogStudentSelect");
      if (select) select.value = selectedStudentId;
      window.UI.openModal("modalNewMonitoring");
    }, 200);
  }

  // 이벤트 바인딩
  document.addEventListener("DOMContentLoaded", () => {
    const formNewStudent = document.getElementById("formNewStudent");
    if (formNewStudent) {
      formNewStudent.addEventListener("submit", handleCreateStudent);
    }

    // 필터 변경 시 자동 조회
    ["filterCenter", "filterRegion", "filterRisk", "filterSchool"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("change", renderClientsList);
    });

    const searchInput = document.getElementById("searchClientKeyword");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        clearTimeout(window._searchTimer);
        window._searchTimer = setTimeout(renderClientsList, 300);
      });
    }
  });

  window.renderClientsList = renderClientsList;
  window.viewStudentDetail = viewStudentDetail;
  window.saveDoctorOpinion = saveDoctorOpinion;
  window.openAddTestForCurrentStudent = openAddTestForCurrentStudent;
  window.openAddLogForCurrentStudent = openAddLogForCurrentStudent;
})();
