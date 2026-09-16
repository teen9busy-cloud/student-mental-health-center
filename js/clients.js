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

      const displayName = s.name;

      return `
        <tr>
          <td><strong style="color:var(--primary)">${s.client_code}</strong></td>
          <td><strong>${displayName}</strong> (${s.gender})</td>
          <td>${regionName} / <span style="font-size:13.5px;color:var(--text-sub)">${centerName}</span></td>
          <td>${s.school_name} (${s.grade}학년)</td>
          <td><span style="font-size:14px;background:#f1f5f9;padding:4px 9px;border-radius:4px">${s.main_concern}</span></td>
          <td>${s.referral_source}</td>
          <td>${riskBadge}</td>
          <td>
            <div style="display:flex;gap:4px">
              <button class="btn btn-outline btn-sm" onclick="window.viewStudentDetail('${s.id}')">상세/기록</button>
              <button class="btn btn-outline btn-sm" style="color:#ef4444;border-color:#fca5a5;padding:3px 7px" title="휴지통으로 이동" onclick="window.deleteStudentById('${s.id}', '${s.name}')">🗑️</button>
            </div>
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
          const hasPdf = !!(t.pdf_data || t.pdf_url || t.file_name);
          const pdfFileName = t.pdf_name || t.file_name || "원본검사지.pdf";

          return `
            <div style="background:#fff;border:1px solid var(--line);border-radius:8px;padding:14px 18px;margin-bottom:12px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <strong style="font-size:16px">${testName}</strong>
                <div style="display:flex;align-items:center;gap:6px">
                  <span style="font-size:14px;color:var(--text-sub);margin-right:4px">${t.test_date}</span>
                  ${window.UI.renderVerdictBadge(t.verdict)}
                  <button type="button" class="btn btn-outline btn-sm" style="color:#ef4444;border-color:#fca5a5;padding:2px 7px;font-size:12px" title="검사 삭제" onclick="window.deleteTestRecord('${t.id}', '${testName}')">🗑️</button>
                </div>
              </div>
              <div style="font-size:14.5px;color:var(--text-main);margin-bottom:6px">
                총점: <strong>${t.total_score}점</strong> ${t.t_score ? `(T점수: ${t.t_score})` : ""} | 실시자: ${t.examiner || "미기재"}
              </div>
              ${t.summary_opinion ? `<div style="font-size:14px;background:#f8fafc;padding:10px 12px;border-radius:6px;color:var(--text-sub);border-left:3px solid var(--primary);margin-bottom:8px;line-height:1.5">${t.summary_opinion}</div>` : ""}
              ${hasPdf ? `
                <div style="margin-top:8px;display:flex;align-items:center;gap:8px">
                  <span class="badge" style="background:#e0e7ff;color:#1e40af;font-size:13px">📎 ${pdfFileName}</span>
                  <button type="button" class="btn btn-outline btn-sm" style="font-size:13px;padding:4px 12px" onclick="window.viewTestPdf('${t.id}')">
                    📄 원본 검사지(PDF) 보기
                  </button>
                </div>
              ` : ""}
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
                    <div class="timeline-header" style="font-size:14px;margin-bottom:6px">
                      <strong>${cType.icon} ${cType.label} (제${l.session_no || 1}회기) - ${l.session_date}</strong>
                      <span>작성: ${l.worker}</span>
                    </div>
                    <div style="font-size:15px;font-weight:600;margin-bottom:6px">${l.session_summary}</div>
                    ${l.student_status ? `<div style="font-size:14px;color:var(--text-sub);margin-bottom:4px"><strong>상태:</strong> ${l.student_status}</div>` : ""}
                    ${l.intervention_details ? `<div style="font-size:14px;color:var(--text-sub);margin-bottom:6px"><strong>개입:</strong> ${l.intervention_details}</div>` : ""}
                    ${l.doctor_opinion ? `<div style="font-size:14px;background:#eff6ff;color:#1e40af;padding:10px 12px;border-radius:6px;border:1px solid #bfdbfe;margin-top:6px;line-height:1.5"><strong>전문의 자문:</strong> ${l.doctor_opinion}</div>` : ""}
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

  // 엑셀 셀 텍스트 안전 추출 헬퍼
  function getExcelCellText(cell) {
    if (!cell || cell.value === null || cell.value === undefined) return "";
    const v = cell.value;
    if (v instanceof Date) return v.toISOString().split("T")[0];
    if (typeof v === "object") {
      if (v.result !== undefined) return String(v.result).trim();
      if (v.text !== undefined) return String(v.text).trim();
      if (Array.isArray(v.richText)) return v.richText.map(t => t.text).join("").trim();
    }
    return String(v).trim();
  }

  // 시군 명칭 -> region_id 변환 헬퍼
  function normalizeRegionId(raw, defaultCenter) {
    if (!raw) return defaultCenter === "changwon" ? "changwon" : "jinju";
    const str = String(raw).trim();
    const found = window.APP_CONFIG.regions.find(r => 
      r.id === str.toLowerCase() || 
      r.name === str || 
      str.includes(r.name.replace("시", "").replace("군", ""))
    );
    return found ? found.id : (defaultCenter === "changwon" ? "changwon" : "jinju");
  }

  // 성별 명칭 유연 처리 헬퍼 (남/여/M/F/남자/여자 복사붙여넣기 지원)
  function normalizeGender(raw) {
    if (!raw) return "남";
    const str = String(raw).trim().toUpperCase();
    if (str.includes("여") || str === "F" || str === "FEMALE" || str === "여자") return "여";
    return "남";
  }

  // 학교급 명칭 유연 처리 헬퍼 (초등/초/중학/중/고등/고 복사붙여넣기 지원)
  function normalizeSchoolLevel(raw) {
    if (!raw) return "중학교";
    const str = String(raw).trim();
    if (str.includes("초")) return "초등학교";
    if (str.includes("고")) return "고등학교";
    if (str.includes("특수")) return "특수학교";
    return "중학교";
  }

  // 위기도 명칭 -> DB 코드 변환 헬퍼 (고위험/주의/관심/일반 등 복사붙여넣기 지원)
  function normalizeRiskLevel(raw) {
    if (!raw) return "MODERATE";
    const str = String(raw).toUpperCase();
    if (str.includes("고위험") || str.includes("위기") || str.includes("SEVERE")) return "SEVERE";
    if (str.includes("주의") || str.includes("우선") || str.includes("MODERATE")) return "MODERATE";
    if (str.includes("관심") || str.includes("MILD")) return "MILD";
    if (str.includes("일반") || str.includes("NORMAL")) return "NORMAL";
    return "MODERATE";
  }

  // 학생 명단 엑셀(.xlsx) 템플릿 다운로드 (드롭다운 데이터 유효성 검사 내장)
  async function downloadStudentSampleTemplate() {
    if (window.ExcelJS) {
      try {
        const wb = new window.ExcelJS.Workbook();
        wb.creator = "경상남도교육청 학생정신건강 전담센터";
        wb.created = new Date();

        const ws = wb.addWorksheet("학생등록양식");
        ws.views = [{ showGridLines: true }];

        ws.columns = [
          { header: "이름*", key: "name", width: 14 },
          { header: "성별*", key: "gender", width: 10 },
          { header: "생년월일", key: "birth_date", width: 15 },
          { header: "소속센터*", key: "center", width: 22 },
          { header: "소속시군*", key: "region", width: 14 },
          { header: "학교급*", key: "school_level", width: 14 },
          { header: "학교명*", key: "school_name", width: 20 },
          { header: "학년", key: "grade", width: 10 },
          { header: "반", key: "class_room", width: 10 },
          { header: "보호자관계", key: "parent_relation", width: 12 },
          { header: "보호자연락처", key: "parent_contact", width: 16 },
          { header: "의뢰경로*", key: "referral_source", width: 24 },
          { header: "주호소문제*", key: "main_concern", width: 26 },
          { header: "초기위기도*", key: "risk_level", width: 20 },
          { header: "특이사항 및 접수메모", key: "notes", width: 34 }
        ];

        // 1. 헤더 스타일링
        const headerRow = ws.getRow(1);
        headerRow.height = 30;
        headerRow.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE0E7FF" }
          };
          cell.font = {
            name: "맑은 고딕",
            size: 11,
            bold: true,
            color: { argb: "FF1E3A8A" }
          };
          cell.alignment = { vertical: "middle", horizontal: "center" };
          cell.border = {
            top: { style: "thin", color: { argb: "FF93C5FD" } },
            left: { style: "thin", color: { argb: "FF93C5FD" } },
            bottom: { style: "medium", color: { argb: "FF2563EB" } },
            right: { style: "thin", color: { argb: "FF93C5FD" } }
          };
        });

        // 2. 참조 코드 목록 시트 생성 (엑셀 드롭다운 목록 소스)
        const refWs = wb.addWorksheet("참조코드목록");
        const genders = ["남", "여"];
        const centers = ["진주센터(서부경남)", "창원센터(동부경남)"];
        const regions = [
          "진주시", "창원시", "통영시", "사천시", "김해시", "밀양시", "거제시", "양산시",
          "의령군", "함안군", "창녕군", "고성군", "남해군", "하동군", "산청군", "함양군", "거창군", "합천군"
        ];
        const schoolLevels = ["초등학교", "중학교", "고등학교", "특수학교"];
        const grades = ["1학년", "2학년", "3학년", "4학년", "5학년", "6학년"];
        const relations = ["모", "부", "조모", "조부", "기타"];
        const referralSources = [
          "Wee클래스(학교)", "Wee센터(교육지원청)", "담임교사", "학부모 직접의뢰", "병원 소아청소년과 연계"
        ];
        const concerns = [
          "우울/무기력", "불안/공황/사회불안", "자해/자살위기", "학교폭력/대인관계 갈등",
          "주의집중(ADHD)/충동성", "품행문제/등교거부", "학업 및 진로 스트레스"
        ];
        const risks = ["일반군", "관심군", "주의군(우선관리)", "고위험군(위기관리)"];

        refWs.getCell("A1").value = "성별";
        genders.forEach((v, i) => refWs.getCell(`A${i + 2}`).value = v);

        refWs.getCell("B1").value = "소속센터";
        centers.forEach((v, i) => refWs.getCell(`B${i + 2}`).value = v);

        refWs.getCell("C1").value = "소속시군";
        regions.forEach((v, i) => refWs.getCell(`C${i + 2}`).value = v);

        refWs.getCell("D1").value = "학교급";
        schoolLevels.forEach((v, i) => refWs.getCell(`D${i + 2}`).value = v);

        refWs.getCell("E1").value = "학년";
        grades.forEach((v, i) => refWs.getCell(`E${i + 2}`).value = v);

        refWs.getCell("F1").value = "보호자관계";
        relations.forEach((v, i) => refWs.getCell(`F${i + 2}`).value = v);

        refWs.getCell("G1").value = "의뢰경로";
        referralSources.forEach((v, i) => refWs.getCell(`G${i + 2}`).value = v);

        refWs.getCell("H1").value = "주호소문제";
        concerns.forEach((v, i) => refWs.getCell(`H${i + 2}`).value = v);

        refWs.getCell("I1").value = "초기위기도";
        risks.forEach((v, i) => refWs.getCell(`I${i + 2}`).value = v);

        // 3. 샘플 행 4개 추가
        const samples = [
          ["홍길동", "남", "2010-05-12", "진주센터(서부경남)", "진주시", "중학교", "진주중학교", "3학년", "1반", "모", "010-1234-5678", "Wee클래스(학교)", "우울/무기력", "주의군(우선관리)", "교우관계 위축 및 학업 스트레스 호소"],
          ["성춘향", "여", "2009-08-20", "창원센터(동부경남)", "창원시", "고등학교", "창원용호고등학교", "2학년", "4반", "부", "010-2345-6789", "담임교사", "불안/공황/사회불안", "관심군", "발표 시 과호흡 및 시험 불안"],
          ["이몽룡", "남", "2008-03-15", "진주센터(서부경남)", "사천시", "고등학교", "사천삼천포고등학교", "3학년", "2반", "모", "010-3456-7890", "병원 소아청소년과 연계", "자해/자살위기", "고위험군(위기관리)", "손목 부위 자해 흔적 및 외래 진료 의뢰"],
          ["심청", "여", "2014-11-03", "창원센터(동부경남)", "김해시", "초등학교", "김해율하초등학교", "6학년", "3반", "부", "010-4567-8901", "학부모 직접의뢰", "주의집중(ADHD)/충동성", "주의군(우선관리)", "수업 중 산만 및 충동 조절 지도 필요"]
        ];

        samples.forEach((row, idx) => {
          const r = ws.addRow(row);
          r.height = 23;
          r.eachCell((cell) => {
            cell.font = { name: "맑은 고딕", size: 10 };
            cell.alignment = { vertical: "middle", horizontal: "center" };
            cell.border = {
              top: { style: "thin", color: { argb: "FFE2E8F0" } },
              left: { style: "thin", color: { argb: "FFE2E8F0" } },
              bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
              right: { style: "thin", color: { argb: "FFE2E8F0" } }
            };
          });
          ws.getCell(`G${idx + 2}`).alignment = { vertical: "middle", horizontal: "left" };
          ws.getCell(`O${idx + 2}`).alignment = { vertical: "middle", horizontal: "left" };
        });

        // 4. 드롭다운 데이터 유효성 검사 적용 (행 2 ~ 500)
        for (let r = 2; r <= 500; r++) {
          ws.getCell(`B${r}`).dataValidation = { type: "list", allowBlank: true, formulae: [`'참조코드목록'!$A$2:$A$${genders.length + 1}`] };
          ws.getCell(`D${r}`).dataValidation = { type: "list", allowBlank: true, formulae: [`'참조코드목록'!$B$2:$B$${centers.length + 1}`] };
          ws.getCell(`E${r}`).dataValidation = { type: "list", allowBlank: true, formulae: [`'참조코드목록'!$C$2:$C$${regions.length + 1}`] };
          ws.getCell(`F${r}`).dataValidation = { type: "list", allowBlank: true, formulae: [`'참조코드목록'!$D$2:$D$${schoolLevels.length + 1}`] };
          ws.getCell(`H${r}`).dataValidation = { type: "list", allowBlank: true, formulae: [`'참조코드목록'!$E$2:$E$${grades.length + 1}`] };
          ws.getCell(`J${r}`).dataValidation = { type: "list", allowBlank: true, formulae: [`'참조코드목록'!$F$2:$F$${relations.length + 1}`] };
          ws.getCell(`L${r}`).dataValidation = { type: "list", allowBlank: true, formulae: [`'참조코드목록'!$G$2:$G$${referralSources.length + 1}`] };
          ws.getCell(`M${r}`).dataValidation = { type: "list", allowBlank: true, formulae: [`'참조코드목록'!$H$2:$H$${concerns.length + 1}`] };
          ws.getCell(`N${r}`).dataValidation = { type: "list", allowBlank: true, formulae: [`'참조코드목록'!$I$2:$I$${risks.length + 1}`] };
        }

        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "경남_학생정신건강전담센터_학생명단_일괄등록_양식.xlsx";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.UI.showToast("드롭다운 선택이 포함된 엑셀(XLSX) 양식이 다운로드되었습니다.", "success");
        return;
      } catch (err) {
        console.error("ExcelJS export error:", err);
      }
    }

    // CSV Fallback
    const csvContent = "\uFEFF이름,성별,생년월일,소속센터,소속시군,학교급,학교명,학년,반,보호자관계,보호자연락처,의뢰경로,주호소문제,초기위기도,특이사항\n" +
      "홍길동,남,2010-05-12,진주센터(서부경남),진주시,중학교,진주중학교,3,1반,모,010-1234-5678,Wee클래스(학교),우울/무기력,주의군(우선관리),교우관계 위축 및 학업 스트레스 호소\n" +
      "성춘향,여,2009-08-20,창원센터(동부경남),창원시,고등학교,창원용호고등학교,2,4반,부,010-2345-6789,담임교사,불안/공황/사회불안,관심군,발표 시 과호흡 및 시험 불안\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "경남_학생정신건강전담센터_학생명단_일괄등록_양식.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.UI.showToast("학생 명단 등록 양식(CSV)이 다운로드되었습니다.", "info");
  }

  // 학생 엑셀/CSV 파서
  let parsedBatchStudents = [];

  async function handleStudentFileUpload(file) {
    if (!file) return;
    parsedBatchStudents = [];

    const isXlsx = file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.type.includes("sheet");

    // 1. XLSX 형식 파일 파싱 (ExcelJS 사용)
    if (isXlsx && window.ExcelJS) {
      try {
        const buffer = await file.arrayBuffer();
        const wb = new window.ExcelJS.Workbook();
        await wb.xlsx.load(buffer);
        const ws = wb.getWorksheet("학생등록양식") || wb.worksheets[0];

        ws.eachRow((row, rowNum) => {
          if (rowNum === 1) return; // 헤더 제외

          const name = getExcelCellText(row.getCell(1));
          if (!name) return;

          const gender = normalizeGender(getExcelCellText(row.getCell(2)));

          let birthDate = getExcelCellText(row.getCell(3));
          if (birthDate) {
            birthDate = birthDate.replace(/[^0-9-]/g, "").slice(0, 10);
            if (birthDate.length < 8) birthDate = null;
          } else {
            birthDate = null;
          }

          const centerRaw = getExcelCellText(row.getCell(4));
          const centerId = centerRaw.includes("창원") || centerRaw.toLowerCase().includes("changwon") ? "changwon" : "jinju";

          const regionRaw = getExcelCellText(row.getCell(5));
          const regionId = normalizeRegionId(regionRaw, centerId);

          const schoolLevel = normalizeSchoolLevel(getExcelCellText(row.getCell(6)));

          const schoolName = getExcelCellText(row.getCell(7));
          if (!schoolName) return;

          const gradeRaw = getExcelCellText(row.getCell(8));
          const gradeMatch = String(gradeRaw).match(/\d+/);
          const grade = gradeMatch ? parseInt(gradeMatch[0], 10) : 1;

          const classRoom = getExcelCellText(row.getCell(9));
          const parentRelation = getExcelCellText(row.getCell(10)) || "모";
          const parentContact = getExcelCellText(row.getCell(11));
          const referralSource = getExcelCellText(row.getCell(12)) || "Wee클래스(학교)";
          const mainConcern = getExcelCellText(row.getCell(13)) || "우울/무기력";
          const riskLevel = normalizeRiskLevel(getExcelCellText(row.getCell(14)));
          const notes = getExcelCellText(row.getCell(15));

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
        });

        if (parsedBatchStudents.length === 0) {
          window.UI.showToast("엑셀 파일에서 등록 가능한 학생 데이터를 찾을 수 없습니다.", "warn");
          return;
        }

        renderStudentUploadPreview(parsedBatchStudents);
        return;
      } catch (err) {
        console.error("XLSX parsing failed:", err);
        window.UI.showToast("엑셀 파일 분석 중 오류가 발생했습니다.", "error");
      }
    }

    // 2. CSV 형식 파일 파싱 (하위 호환)
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
        const gender = normalizeGender(row[1]);
        const birthDate = row[2] || null;
        const centerRaw = row[3] || "jinju";
        const centerId = centerRaw.includes("창원") || centerRaw.toLowerCase().includes("changwon") ? "changwon" : "jinju";
        const regionId = normalizeRegionId(row[4], centerId);
        const schoolLevel = normalizeSchoolLevel(row[5]);
        const schoolName = row[6] || "";
        const gradeMatch = String(row[7] || "1").match(/\d+/);
        const grade = gradeMatch ? parseInt(gradeMatch[0], 10) : 1;
        const classRoom = row[8] || "";
        const parentRelation = row[9] || "부모";
        const parentContact = row[10] || "";
        const referralSource = row[11] || "Wee클래스(학교)";
        const mainConcern = row[12] || "우울/무기력";
        const riskLevel = normalizeRiskLevel(row[13]);
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
      const kw = searchInput.value.trim();
      if (!kw) {
        dropdown.style.display = "none";
        return;
      }
      const kwLower = kw.toLowerCase();

      const allStudents = await window.DB.getClients();
      const matches = allStudents.filter(s =>
        (s.name && s.name.toLowerCase().includes(kwLower)) ||
        (s.client_code && s.client_code.toLowerCase().includes(kwLower)) ||
        (s.school_name && s.school_name.toLowerCase().includes(kwLower))
      ).slice(0, 8);

      let itemsHtml = "";
      if (matches.length > 0) {
        itemsHtml = matches.map(s => {
          const riskBadge = window.UI.renderRiskBadge(s.risk_level);
          return `
            <div class="search-dropdown-item student-match-item" data-id="${s.id}" data-name="${s.name}" data-code="${s.client_code}" data-school="${s.school_name}" data-risk="${s.risk_level}">
              <div>
                <strong>${s.name}</strong> (${s.gender}) - <span style="font-size:12.5px;color:var(--text-sub)">${s.school_name}</span>
                <div style="font-size:11.5px;color:var(--primary)">${s.client_code} | ${s.main_concern}</div>
              </div>
              <div>${riskBadge}</div>
            </div>
          `;
        }).join("");
      }

      // 항상 하단(또는 검색결과 없을 시)에 신규 학생 즉시 생성 & 연결 옵션 노출
      const newOptionHtml = `
        <div class="search-dropdown-item auto-create-item" data-name="${kw}" style="background:#f0f9ff;border-top:${matches.length > 0 ? '1px dashed #bae6fd' : 'none'};display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:10px 12px">
          <div>
            <span style="color:#0284c7;font-weight:700;">✨ "+ ${kw}" 학생 신규 프로필 생성</span>
            <div style="font-size:11.5px;color:#0369a1;">저장 시 학생 프로필이 자동으로 생성되고 즉시 연결됩니다.</div>
          </div>
          <span style="background:#0284c7;color:#fff;font-size:11px;font-weight:bold;padding:3px 8px;border-radius:4px;">자동 생성 +</span>
        </div>
      `;

      dropdown.innerHTML = itemsHtml + newOptionHtml;
      dropdown.style.display = "block";

      dropdown.querySelectorAll(".student-match-item").forEach(item => {
        item.addEventListener("click", () => {
          const sid = item.dataset.id;
          const sname = item.dataset.name;
          const scode = item.dataset.code;
          const sschool = item.dataset.school;

          hiddenInput.value = sid;
          hiddenInput.dataset.name = sname;
          hiddenInput.dataset.code = scode;
          delete hiddenInput.dataset.isNew;
          delete hiddenInput.dataset.gender;
          delete hiddenInput.dataset.school;
          delete hiddenInput.dataset.birth;

          cardText.innerHTML = `<strong>${sname}</strong> (${scode}) - ${sschool}`;
          card.style.display = "inline-flex";
          searchInput.style.display = "none";
          dropdown.style.display = "none";
          searchInput.value = "";
        });
      });

      const createBtn = dropdown.querySelector(".auto-create-item");
      if (createBtn) {
        createBtn.addEventListener("click", () => {
          const sname = createBtn.dataset.name;
          hiddenInput.value = "__NEW__";
          hiddenInput.dataset.name = sname;
          hiddenInput.dataset.isNew = "true";
          delete hiddenInput.dataset.code;
          delete hiddenInput.dataset.gender;
          delete hiddenInput.dataset.school;
          delete hiddenInput.dataset.birth;

          cardText.innerHTML = `<span style="background:#0284c7;color:#fff;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700;margin-right:6px;">✨신규</span><strong>${sname}</strong> (저장 시 프로필 자동생성)`;
          card.style.display = "inline-flex";
          searchInput.style.display = "none";
          dropdown.style.display = "none";
          searchInput.value = "";
        });
      }
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
    if (hidden) {
      hidden.value = "";
      delete hidden.dataset.name;
      delete hidden.dataset.code;
      delete hidden.dataset.isNew;
      delete hidden.dataset.gender;
      delete hidden.dataset.school;
      delete hidden.dataset.birth;
    }
    if (card) card.style.display = "none";
    if (search) { search.style.display = "block"; search.value = ""; search.focus(); }
  };

  window.clearSelectedLogStudent = function() {
    const hidden = document.getElementById("newLogStudentSelect");
    const card = document.getElementById("newLogSelectedCard");
    const search = document.getElementById("newLogStudentSearch");
    if (hidden) {
      hidden.value = "";
      delete hidden.dataset.name;
      delete hidden.dataset.code;
      delete hidden.dataset.isNew;
      delete hidden.dataset.gender;
      delete hidden.dataset.school;
      delete hidden.dataset.birth;
    }
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
        window._searchTimer = setTimeout(renderClientsList, 200);
      });
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          clearTimeout(window._searchTimer);
          renderClientsList();
        }
      });
    }
  });

  // 학생 필터 및 검색어 초기화 함수
  window.resetClientFilters = function() {
    if (document.getElementById("filterCenter")) document.getElementById("filterCenter").value = "all";
    if (document.getElementById("filterRegion")) document.getElementById("filterRegion").value = "all";
    if (document.getElementById("filterRisk")) document.getElementById("filterRisk").value = "all";
    if (document.getElementById("filterSchool")) document.getElementById("filterSchool").value = "all";
    const kwInput = document.getElementById("searchClientKeyword");
    if (kwInput) {
      kwInput.value = "";
      kwInput.focus();
    }
    renderClientsList();
  };

  // 원본 검사지(PDF) 새 탭/뷰어 열람
  window.viewTestPdf = async function(testId) {
    const tests = await window.DB.getTests();
    const test = tests.find(t => t.id === testId);
    if (!test) return;

    let pdfSrc = test.pdf_data || test.pdf_url;
    if (!pdfSrc && test.file_name) {
      pdfSrc = `./${test.file_name}`;
    }

    if (!pdfSrc) {
      window.UI.showToast("첨부된 원본 PDF 파일이 없습니다.", "warn");
      return;
    }

    // 새 탭에서 열기
    const win = window.open();
    if (win) {
      win.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${test.file_name || "심리검사지_원본.pdf"}</title>
            <meta charset="utf-8">
            <style>
              body { margin: 0; padding: 0; background: #525659; font-family: sans-serif; height: 100vh; display: flex; flex-direction: column; }
              .pdf-header { background: #323639; color: #fff; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; }
              iframe { flex: 1; border: none; width: 100%; height: calc(100vh - 45px); }
            </style>
          </head>
          <body>
            <div class="pdf-header">
              <span><strong>📄 심리검사 원본 결과지:</strong> ${test.file_name || "원본검사지.pdf"} (${test.client_name} 학생)</span>
              <a href="${pdfSrc}" download="${test.file_name || "검사결과지.pdf"}" style="color:#60a5fa;text-decoration:none;font-size:13px">📥 파일 다운로드</a>
            </div>
            <iframe src="${pdfSrc}"></iframe>
          </body>
        </html>
      `);
    } else {
      window.UI.showToast("팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 클릭해 주세요.", "warn");
    }
  };

  window.renderClientsList = renderClientsList;
  window.viewStudentDetail = viewStudentDetail;
  window.saveDoctorOpinion = saveDoctorOpinion;
  window.openAddTestForCurrentStudent = openAddTestForCurrentStudent;
  window.openAddLogForCurrentStudent = openAddLogForCurrentStudent;
  window.getSelectedStudentId = () => selectedStudentId;
})();
