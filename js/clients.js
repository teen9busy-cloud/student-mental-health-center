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

  // 학생 명단 CSV 템플릿 다운로드
  function downloadStudentSampleTemplate() {
    const csvContent = "\uFEFF이름,성별,생년월일,소속센터,소속시군,학교급,학교명,학년,반,보호자관계,보호자연락처,의뢰경로,주호소문제,초기위기도,특이사항\n" +
      "홍길동,남,2010-05-12,jinju,jinju,중학교,진주중학교,3,1반,모,010-1234-5678,Wee클래스(학교),우울/무기력,MODERATE,교우관계 위축 및 학업 스트레스 호소\n" +
      "성춘향,여,2009-08-20,changwon,changwon,고등학교,창원용호고등학교,2,4반,부,010-2345-6789,담임교사,불안/공황/사회불안,MILD,발표 시 과호흡 및 시험 불안\n" +
      "이몽룡,남,2008-03-15,jinju,sacheon,고등학교,사천삼천포고등학교,3,2반,모,010-3456-7890,병원 소아청소년과 연계,자해/자살위기,SEVERE,손목 부위 자해 흔적 및 외래 진료 의뢰\n" +
      "심청,여,2014-11-03,changwon,gimhae,초등학교,김해율하초등학교,6,3반,부,010-4567-8901,학부모 직접의뢰,주의집중(ADHD)/충동성,MODERATE,수업 중 산만 및 충동 조절 지도 필요\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "경남_학생정신건강전담센터_학생명단_일괄등록_양식.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.UI.showToast("학생 명단 일괄 등록 양식(CSV)이 다운로드되었습니다.", "info");
  }

  // 학생 엑셀/CSV 파서
  let parsedBatchStudents = [];

  function handleStudentFileUpload(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
      if (lines.length < 2) {
        window.UI.showToast("파일에 유효한 학생 데이터가 없습니다.", "warn");
        return;
      }

      parsedBatchStudents = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ''));
        if (row.length < 5) continue;

        const name = row[0];
        const gender = row[1] || "남";
        const birthDate = row[2] || null;
        const centerId = row[3] || "jinju";
        const regionId = row[4] || "jinju";
        const schoolLevel = row[5] || "중학교";
        const schoolName = row[6] || "";
        const grade = parseInt(row[7], 10) || 1;
        const classRoom = row[8] || "";
        const parentRelation = row[9] || "부모";
        const parentContact = row[10] || "";
        const referralSource = row[11] || "Wee클래스(학교)";
        const mainConcern = row[12] || "우울/무기력";
        const riskLevel = row[13] || "MODERATE";
        const notes = row[14] || "";

        if (!name || !schoolName) continue;

        parsedBatchStudents.push({
          name,
          gender,
          birth_date: birthDate,
          center_id: centerId,
          region_id: regionId,
          school_level: schoolLevel,
          school_name: schoolName,
          grade,
          class_room: classRoom,
          parent_relation: parentRelation,
          parent_contact: parentContact,
          referral_source: referralSource,
          main_concern: mainConcern,
          risk_level: riskLevel,
          assigned_worker: "이민호 사회복지사",
          assigned_psych: "박서연 임상심리사",
          notes
        });
      }

      renderStudentUploadPreview(parsedBatchStudents);
    };
    reader.readAsText(file, "utf-8");
  }

  // 학생 명단 업로드 미리보기 렌더링
  function renderStudentUploadPreview(data) {
    const container = document.getElementById("uploadStudentPreviewContainer");
    const tbody = document.getElementById("uploadStudentPreviewTbody");
    const countEl = document.getElementById("uploadStudentCount");
    const saveBtn = document.getElementById("btnConfirmBatchStudentUpload");
    if (!container || !tbody) return;

    container.style.display = "block";
    if (countEl) countEl.textContent = data.length;
    if (saveBtn) saveBtn.disabled = data.length === 0;

    tbody.innerHTML = data.map((s, idx) => {
      const reg = window.APP_CONFIG.regions.find(r => r.id === s.region_id);
      const regName = reg ? reg.name : s.region_id;
      const centerName = s.center_id === "jinju" ? "진주" : "창원";
      const riskBadge = window.UI.renderRiskBadge(s.risk_level);

      return `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${s.name}</strong> (${s.gender})</td>
          <td>${s.school_name} (${s.grade}학년)</td>
          <td>${regName} / ${centerName}</td>
          <td><span style="font-size:12.5px;background:#f1f5f9;padding:2px 6px;border-radius:4px">${s.main_concern}</span></td>
          <td>${s.referral_source}</td>
          <td>${riskBadge}</td>
        </tr>
      `;
    }).join("");

    window.UI.showToast(`${data.length}명의 학생 명단이 분석되었습니다. 검토 후 저장해 주세요.`, "success");
  }

  // 학생 일괄 저장 확정
  async function confirmBatchStudentUpload() {
    if (parsedBatchStudents.length === 0) return;

    try {
      let successCount = 0;
      for (const s of parsedBatchStudents) {
        await window.DB.addClient(s);
        successCount++;
      }
      window.UI.showToast(`${successCount}명의 학생이 수파베이스 DB에 성공적으로 일괄 등록되었습니다!`, "success");
      parsedBatchStudents = [];
      window.UI.closeModal("modalUploadStudents");
      renderClientsList();
      if (window.renderDashboard) window.renderDashboard();
    } catch(err) {
      console.error(err);
      window.UI.showToast("학생 일괄 등록 중 오류가 발생했습니다.", "error");
    }
  }

  // 공통 학생 검색 자동완성 셋업 함수
  function setupStudentAutocomplete(searchInputId, dropdownId, cardId, cardTextId, hiddenInputId) {
    const searchInput = document.getElementById(searchInputId);
    const dropdown = document.getElementById(dropdownId);
    const card = document.getElementById(cardId);
    const cardText = document.getElementById(cardTextId);
    const hiddenInput = document.getElementById(hiddenInputId);

    if (!searchInput || !dropdown) return;

    searchInput.addEventListener("input", async () => {
      const kw = searchInput.value.trim().toLowerCase();
      if (!kw) {
        dropdown.style.display = "none";
        return;
      }

      const allStudents = await window.DB.getClients();
      const matches = allStudents.filter(s =>
        (s.name && s.name.toLowerCase().includes(kw)) ||
        (s.client_code && s.client_code.toLowerCase().includes(kw)) ||
        (s.school_name && s.school_name.toLowerCase().includes(kw))
      ).slice(0, 8);

      if (matches.length === 0) {
        dropdown.innerHTML = `<div style="padding:12px;color:var(--text-sub);text-align:center;font-size:13px">일치하는 학생이 없습니다.</div>`;
        dropdown.style.display = "block";
        return;
      }

      dropdown.innerHTML = matches.map(s => {
        const riskBadge = window.UI.renderRiskBadge(s.risk_level);
        return `
          <div class="search-dropdown-item" data-id="${s.id}" data-name="${s.name}" data-code="${s.client_code}" data-school="${s.school_name}" data-risk="${s.risk_level}">
            <div>
              <strong>${s.name}</strong> (${s.gender}) - <span style="font-size:12.5px;color:var(--text-sub)">${s.school_name}</span>
              <div style="font-size:11.5px;color:var(--primary)">${s.client_code} | ${s.main_concern}</div>
            </div>
            <div>${riskBadge}</div>
          </div>
        `;
      }).join("");

      dropdown.style.display = "block";

      dropdown.querySelectorAll(".search-dropdown-item").forEach(item => {
        item.addEventListener("click", () => {
          const sid = item.dataset.id;
          const sname = item.dataset.name;
          const scode = item.dataset.code;
          const sschool = item.dataset.school;

          hiddenInput.value = sid;
          hiddenInput.dataset.name = sname;
          hiddenInput.dataset.code = scode;

          cardText.innerHTML = `<strong>${sname}</strong> (${scode}) - ${sschool}`;
          card.style.display = "inline-flex";
          searchInput.style.display = "none";
          dropdown.style.display = "none";
          searchInput.value = "";
        });
      });
    });

    document.addEventListener("click", (e) => {
      if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = "none";
      }
    });
  }

  // 선택 취소 함수들
  window.clearSelectedTestStudent = function() {
    const hidden = document.getElementById("newTestStudentSelect");
    const card = document.getElementById("newTestSelectedCard");
    const search = document.getElementById("newTestStudentSearch");
    if (hidden) { hidden.value = ""; delete hidden.dataset.name; delete hidden.dataset.code; }
    if (card) card.style.display = "none";
    if (search) { search.style.display = "block"; search.value = ""; search.focus(); }
  };

  window.clearSelectedLogStudent = function() {
    const hidden = document.getElementById("newLogStudentSelect");
    const card = document.getElementById("newLogSelectedCard");
    const search = document.getElementById("newLogStudentSearch");
    if (hidden) { hidden.value = ""; delete hidden.dataset.name; delete hidden.dataset.code; }
    if (card) card.style.display = "none";
    if (search) { search.style.display = "block"; search.value = ""; search.focus(); }
  };

  // 상세 모달에서 바로 검사 추가 모달 열기
  async function openAddTestForCurrentStudent() {
    if (!selectedStudentId) return;
    const student = await window.DB.getClientById(selectedStudentId);
    window.UI.closeModal("modalStudentDetail");
    window.UI.switchTab("tests");
    setTimeout(() => {
      window.UI.openModal("modalNewTest");
      if (student) {
        const hidden = document.getElementById("newTestStudentSelect");
        const card = document.getElementById("newTestSelectedCard");
        const cardText = document.getElementById("newTestSelectedText");
        const search = document.getElementById("newTestStudentSearch");
        if (hidden) { hidden.value = student.id; hidden.dataset.name = student.name; hidden.dataset.code = student.client_code; }
        if (cardText) cardText.innerHTML = `<strong>${student.name}</strong> (${student.client_code}) - ${student.school_name}`;
        if (card) card.style.display = "inline-flex";
        if (search) search.style.display = "none";
      }
    }, 200);
  }

  // 상세 모달에서 바로 모니터링 추가 모달 열기
  async function openAddLogForCurrentStudent() {
    if (!selectedStudentId) return;
    const student = await window.DB.getClientById(selectedStudentId);
    window.UI.closeModal("modalStudentDetail");
    window.UI.switchTab("monitoring");
    setTimeout(() => {
      window.UI.openModal("modalNewMonitoring");
      if (student) {
        const hidden = document.getElementById("newLogStudentSelect");
        const card = document.getElementById("newLogSelectedCard");
        const cardText = document.getElementById("newLogSelectedText");
        const search = document.getElementById("newLogStudentSearch");
        if (hidden) { hidden.value = student.id; hidden.dataset.name = student.name; hidden.dataset.code = student.client_code; }
        if (cardText) cardText.innerHTML = `<strong>${student.name}</strong> (${student.client_code}) - ${student.school_name}`;
        if (card) card.style.display = "inline-flex";
        if (search) search.style.display = "none";
      }
    }, 200);
  }

  // 이벤트 바인딩
  document.addEventListener("DOMContentLoaded", () => {
    const formNewStudent = document.getElementById("formNewStudent");
    if (formNewStudent) {
      formNewStudent.addEventListener("submit", handleCreateStudent);
    }

    // 학생 일괄등록 드롭존
    const studentDropzone = document.getElementById("studentFileDropzone");
    const studentFileInput = document.getElementById("studentFileInput");
    const btnDownloadStuTpl = document.getElementById("btnDownloadStudentTemplate");
    const btnConfirmStuUpload = document.getElementById("btnConfirmBatchStudentUpload");

    if (studentDropzone && studentFileInput) {
      studentDropzone.addEventListener("click", () => studentFileInput.click());
      studentFileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) handleStudentFileUpload(e.target.files[0]);
      });
      studentDropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        studentDropzone.classList.add("dragover");
      });
      studentDropzone.addEventListener("dragleave", () => {
        studentDropzone.classList.remove("dragover");
      });
      studentDropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        studentDropzone.classList.remove("dragover");
        if (e.dataTransfer.files.length > 0) {
          handleStudentFileUpload(e.dataTransfer.files[0]);
        }
      });
    }

    if (btnDownloadStuTpl) {
      btnDownloadStuTpl.addEventListener("click", downloadStudentSampleTemplate);
    }
    if (btnConfirmStuUpload) {
      btnConfirmStuUpload.addEventListener("click", confirmBatchStudentUpload);
    }

    // 학생 검색 자동완성 셋업 (검사 등록 모달 & 모니터링 모달)
    setupStudentAutocomplete("newTestStudentSearch", "newTestSearchResults", "newTestSelectedCard", "newTestSelectedText", "newTestStudentSelect");
    setupStudentAutocomplete("newLogStudentSearch", "newLogSearchResults", "newLogSelectedCard", "newLogSelectedText", "newLogStudentSelect");

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
