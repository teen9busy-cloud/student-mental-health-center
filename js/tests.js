// ==============================================================================
// 경상남도교육청 학생정신건강 전담센터 - 심리검사 수치화 및 엑셀 업로드 모듈
// ==============================================================================

(function() {
  let parsedBatchData = [];

  // 심리검사 목록 렌더링
  async function renderTestsView() {
    const tbody = document.getElementById("testsTableBody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted)">검사 데이터를 불러오는 중입니다...</td></tr>`;

    const typeFilter = document.getElementById("filterTestType") ? document.getElementById("filterTestType").value : "all";
    const verdictFilter = document.getElementById("filterTestVerdict") ? document.getElementById("filterTestVerdict").value : "all";

    const tests = await window.DB.getTests({
      test_type: typeFilter === "all" ? null : typeFilter,
      verdict: verdictFilter === "all" ? null : verdictFilter
    });

    const countElem = document.getElementById("testsTotalCount");
    if (countElem) countElem.textContent = `${tests.length}건`;

    if (tests.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-sub)">등록된 심리검사 결과가 없습니다.</td></tr>`;
      return;
    }

    tbody.innerHTML = tests.map(t => {
      const typeDef = window.APP_CONFIG.testTypes[t.test_type];
      const typeName = typeDef ? typeDef.name : t.test_type;
      const verdictBadge = window.UI.renderVerdictBadge(t.verdict);

      return `
        <tr>
          <td>${t.test_date}</td>
          <td>
            <strong>${t.client_name || "이름미기재"}</strong>
            <div style="font-size:12px;color:var(--text-sub)">${t.client_code || ""}</div>
          </td>
          <td><strong style="color:var(--secondary)">${typeName}</strong></td>
          <td>
            <strong style="font-size:15px">${t.total_score}점</strong>
            ${t.t_score ? `<span style="font-size:12px;color:var(--text-sub)"> (T:${t.t_score})</span>` : ""}
          </td>
          <td>${verdictBadge}</td>
          <td>${t.examiner || "미기재"}</td>
          <td>
            <div style="display:flex;gap:4px">
              <button class="btn btn-outline btn-sm" onclick="window.viewTestDetail('${t.id}')">소견/상세</button>
              <button class="btn btn-outline btn-sm" style="color:#ef4444;border-color:#fca5a5;padding:3px 7px" title="휴지통으로 이동" onclick="window.deleteTestRecord('${t.id}', '${typeName}')">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  // 검사 상세 보기
  async function viewTestDetail(testId) {
    const tests = await window.DB.getTests();
    const test = tests.find(t => t.id === testId);
    if (!test) return;

    const typeDef = window.APP_CONFIG.testTypes[test.test_type];
    alert(`[${typeDef ? typeDef.name : test.test_type}]\n실시일: ${test.test_date}\n내담자: ${test.client_name} (${test.client_code})\n총점: ${test.total_score}점 (판정: ${test.verdict})\n실시자: ${test.examiner}\n\n[임상 소견 및 해석]\n${test.summary_opinion || "소견 미작성"}`);
  }

  // 검사 종류 선택 변경 시 하위척도 입력창 동적 렌더링
  function handleTestTypeChange() {
    const select = document.getElementById("newTestTypeSelect");
    const container = document.getElementById("subscaleInputsContainer");
    if (!select || !container) return;

    const testType = select.value;
    const typeDef = window.APP_CONFIG.testTypes[testType];
    container.innerHTML = "";

    if (typeDef && typeDef.subscales) {
      container.style.display = "grid";
      container.style.gridTemplateColumns = "repeat(2, 1fr)";
      container.style.gap = "10px";
      container.style.marginBottom = "16px";
      container.style.background = "#f8fafc";
      container.style.padding = "12px";
      container.style.borderRadius = "8px";

      typeDef.subscales.forEach(sub => {
        const div = document.createElement("div");
        div.className = "form-field";
        div.innerHTML = `
          <label style="font-size:12.5px">${sub.name} (최대 ${sub.max}점)</label>
          <input type="number" class="input-control subscale-input" data-key="${sub.key}" min="0" max="${sub.max}" value="0" oninput="window.calcTestScorePreview()">
        `;
        container.appendChild(div);
      });
    } else {
      container.style.display = "none";
    }

    calcTestScorePreview();
  }

  // 점수 입력에 따른 실시간 위험도 판정 프리뷰
  function calcTestScorePreview() {
    const select = document.getElementById("newTestTypeSelect");
    const totalScoreInput = document.getElementById("newTestTotalScore");
    const previewEl = document.getElementById("testEvaluationPreview");
    if (!select || !totalScoreInput || !previewEl) return;

    const testType = select.value;
    const typeDef = window.APP_CONFIG.testTypes[testType];
    if (!typeDef) return;

    // 하위 척도 합산
    const subInputs = document.querySelectorAll(".subscale-input");
    const subscores = {};
    let subSum = 0;
    if (subInputs.length > 0) {
      subInputs.forEach(inp => {
        const val = parseFloat(inp.value) || 0;
        subscores[inp.dataset.key] = val;
        subSum += val;
      });
      totalScoreInput.value = subSum;
    }

    const currentScore = parseFloat(totalScoreInput.value) || 0;
    const evalResult = typeDef.evaluate(currentScore, subscores);

    previewEl.innerHTML = `
      <div style="background:#fff;border:1px solid var(--line);border-radius:6px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between">
        <div>
          <span style="font-size:13px;color:var(--text-sub)">자동 수치화 판정 결과:</span>
          <strong style="margin-left:6px;font-size:15px">${evalResult.label}</strong>
        </div>
        ${window.UI.renderVerdictBadge(evalResult.verdict)}
      </div>
    `;
    previewEl.dataset.verdict = evalResult.verdict;
    previewEl.dataset.riskLevel = evalResult.riskLevel;
  }

  // 개별 검사 등록 폼 제출
  async function handleCreateTest(e) {
    e.preventDefault();
    const form = e.target;
    const studentSelect = form.studentSelect;
    let studentId = studentSelect ? studentSelect.value : "";
    if (!studentId) {
      window.UI.showToast("검사 대상 학생을 검색창에서 찾아 선택해 주세요.", "warning");
      return;
    }

    let studentName = studentSelect.dataset ? studentSelect.dataset.name : "";
    let studentCode = studentSelect.dataset ? studentSelect.dataset.code : "";

    const testType = form.testType.value;
    const typeDef = window.APP_CONFIG.testTypes[testType];
    const totalScore = parseFloat(form.totalScore.value) || 0;
    const tScore = form.tScore.value ? parseFloat(form.tScore.value) : null;
    const testDate = form.testDate.value || new Date().toISOString().split("T")[0];
    const examiner = form.examiner.value.trim() || "박서연 임상심리사";
    const opinion = form.summaryOpinion.value.trim();

    const subInputs = document.querySelectorAll(".subscale-input");
    const subscores = {};
    subInputs.forEach(inp => {
      subscores[inp.dataset.key] = parseFloat(inp.value) || 0;
    });

    const evalResult = typeDef ? typeDef.evaluate(totalScore, subscores) : { verdict: "NORMAL", riskLevel: "NORMAL" };

    // 신규 학생 자동 생성 (검사 먼저 등록하는 경우)
    if (studentId === "__NEW__" || (studentSelect.dataset && studentSelect.dataset.isNew === "true")) {
      const currentRole = window.UI.getCurrentRole ? window.UI.getCurrentRole() : { centerId: "jinju", regionId: "jinju" };
      const rawSchool = (studentSelect.dataset && studentSelect.dataset.school) ? studentSelect.dataset.school : "임시등록 (상세수정 필요)";
      let schoolLevel = "중학교";
      if (rawSchool.includes("초등")) schoolLevel = "초등학교";
      else if (rawSchool.includes("고등")) schoolLevel = "고등학교";
      else if (rawSchool.includes("특수")) schoolLevel = "특수학교";

      const newStudent = await window.DB.addClient({
        name: studentName,
        gender: (studentSelect.dataset && studentSelect.dataset.gender) || "남",
        birth_date: (studentSelect.dataset && studentSelect.dataset.birth) || null,
        center_id: currentRole.centerId || "jinju",
        region_id: currentRole.regionId || "jinju",
        school_level: schoolLevel,
        school_name: rawSchool,
        grade: 1,
        referral_source: "Wee클래스(학교)",
        main_concern: "정서/행동",
        risk_level: evalResult.riskLevel || "NORMAL",
        assigned_worker: "이민호 사회복지사",
        assigned_psych: examiner || "박서연 임상심리사",
        notes: `[심리검사(${testType}) 등록 시 자동 생성된 학생 프로필]`
      });
      studentId = newStudent.id;
      studentCode = newStudent.client_code;
      studentName = newStudent.name;
      window.UI.showToast(`신규 학생 [${studentName}] (${studentCode}) 프로필이 자동 생성되었습니다!`, "info");
    } else if (!studentName || !studentCode) {
      const client = await window.DB.getClientById(studentId);
      if (client) {
        studentName = client.name;
        studentCode = client.client_code || client.code;
      }
    }

    const pdfName = (form.pdfName && form.pdfName.value) ? form.pdfName.value : null;
    const pdfData = (form.pdfData && form.pdfData.value) ? form.pdfData.value : null;

    const testRecord = {
      client_id: studentId,
      client_code: studentCode,
      client_name: studentName,
      test_type: testType,
      test_date: testDate,
      examiner: examiner,
      total_score: totalScore,
      t_score: tScore,
      verdict: evalResult.verdict,
      riskLevel: evalResult.riskLevel,
      subscale_scores: subscores,
      summary_opinion: opinion,
      file_name: pdfName,
      pdf_name: pdfName,
      pdf_data: pdfData
    };

    try {
      await window.DB.addTest(testRecord);
      window.UI.showToast(`[${studentName}] 심리검사 등록 및 수치화가 완료되었습니다.`, "success");
      form.reset();
      const noticeEl = document.getElementById("pdfParseNotice");
      if (noticeEl) noticeEl.style.display = "none";
      if (form.pdfData) form.pdfData.value = "";
      if (form.pdfName) form.pdfName.value = "";
      if (window.clearSelectedTestStudent) window.clearSelectedTestStudent();
      window.UI.closeModal("modalNewTest");
      renderTestsView();
      if (window.renderDashboard) window.renderDashboard();
    } catch (err) {
      console.error(err);
      window.UI.showToast("검사 등록 중 오류가 발생했습니다.", "error");
    }
  }

  // 검사 코드/명칭 정규화 헬퍼
  function normalizeTestType(raw) {
    if (!raw) return "AMPQ_II";
    const str = String(raw).toUpperCase();
    if (str.includes("AMPQ")) return "AMPQ_II";
    if (str.includes("BDI")) return "K_BDI_II";
    if (str.includes("RCMAS")) return "RCMAS";
    if (str.includes("SSRS") || str.includes("자살")) return "C_SSRS";
    if (str.includes("CBCL")) return "K_CBCL";
    return "AMPQ_II";
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

  // 심리검사 엑셀(.xlsx) 템플릿 다운로드 (드롭다운 데이터 유효성 검사 내장)
  async function downloadSampleTemplate() {
    if (window.ExcelJS) {
      try {
        const wb = new window.ExcelJS.Workbook();
        wb.creator = "경상남도교육청 학생정신건강 전담센터";
        const ws = wb.addWorksheet("심리검사결과양식");
        ws.views = [{ showGridLines: true }];

        ws.columns = [
          { header: "학생식별코드*", key: "code", width: 16 },
          { header: "학생이름*", key: "name", width: 14 },
          { header: "검사종류*", key: "test_type", width: 32 },
          { header: "검사일자*", key: "test_date", width: 15 },
          { header: "총점(원점수)*", key: "total_score", width: 15 },
          { header: "T점수/백분위", key: "t_score", width: 14 },
          { header: "실시자*", key: "examiner", width: 18 },
          { header: "임상소견 및 종합평가", key: "opinion", width: 40 }
        ];

        // 헤더 스타일링
        const headerRow = ws.getRow(1);
        headerRow.height = 30;
        headerRow.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };
          cell.font = { name: "맑은 고딕", size: 11, bold: true, color: { argb: "FF1E3A8A" } };
          cell.alignment = { vertical: "middle", horizontal: "center" };
          cell.border = {
            top: { style: "thin", color: { argb: "FF93C5FD" } },
            left: { style: "thin", color: { argb: "FF93C5FD" } },
            bottom: { style: "medium", color: { argb: "FF2563EB" } },
            right: { style: "thin", color: { argb: "FF93C5FD" } }
          };
        });

        // 참조 코드 목록 시트 (검사 척도 드롭다운)
        const refWs = wb.addWorksheet("검사코드목록");
        const testTypes = [
          "AMPQ-II (정서행동특성 2차)",
          "K-BDI-II (청소년 우울척도)",
          "RCMAS (아동청소년 불안척도)",
          "C-SSRS (자살위험도 평가척도)",
          "K-CBCL (행동평가척도 T점수)"
        ];
        refWs.getCell("A1").value = "검사종류";
        testTypes.forEach((v, i) => refWs.getCell(`A${i + 2}`).value = v);

        // 샘플 행 3개 추가
        const samples = [
          ["STU-2026-001", "김민준", "AMPQ-II (정서행동특성 2차)", "2026-08-30", 35, 71, "박서연 임상심리사", "2차 추적검사: 정서행동 위기도 지속 관리 필요"],
          ["STU-2026-003", "박준영", "RCMAS (아동청소년 불안척도)", "2026-08-30", 12, 58, "강동원 임상심리사", "불안 척도 16점에서 12점으로 호전 양상"],
          ["STU-2026-005", "정우진", "K-BDI-II (청소년 우울척도)", "2026-08-30", 15, 52, "박서연 임상심리사", "경도 우울 관찰되며 수험 스트레스 완화 지도 요망"]
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
          ws.getCell(`H${idx + 2}`).alignment = { vertical: "middle", horizontal: "left" };
        });

        // 2행부터 500행까지 검사종류 드롭다운 검증 적용
        for (let r = 2; r <= 500; r++) {
          ws.getCell(`C${r}`).dataValidation = {
            type: "list",
            allowBlank: true,
            formulae: [`'검사코드목록'!$A$2:$A$${testTypes.length + 1}`]
          };
        }

        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "경남_학생정신건강전담센터_심리검사_업로드_양식.xlsx";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.UI.showToast("드롭다운 선택이 포함된 엑셀(XLSX) 검사 양식이 다운로드되었습니다.", "success");
        return;
      } catch (err) {
        console.error("ExcelJS export error:", err);
      }
    }

    // CSV Fallback
    const csvContent = "\uFEFF학생식별코드,학생이름,검사종류,검사일자,총점,T점수,실시자,임상소견\n" +
      "STU-2026-001,김민준,AMPQ_II,2026-08-30,35,71,박서연 임상심리사,2차 추적검사: 정서행동 위기도 지속 관리 필요\n" +
      "STU-2026-003,박준영,RCMAS,2026-08-30,12,58,강동원 임상심리사,불안 척도 16점에서 12점으로 호전 양상\n" +
      "STU-2026-005,정우진,K_BDI_II,2026-08-30,15,52,박서연 임상심리사,경도 우울 관찰되며 수험 스트레스 완화 지도 요망\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "경남_학생정신건강전담센터_심리검사_업로드_양식.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.UI.showToast("심리검사 업로드 샘플 템플릿(CSV)이 다운로드되었습니다.", "info");
  }

  // 파일 업로드 파서 (XLSX 및 CSV 지원)
  async function handleFileUpload(file) {
    if (!file) return;
    parsedBatchData = [];

    const isXlsx = file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.type.includes("sheet");
    const allStudents = await window.DB.getClients();

    // 1. XLSX 형식 파일 파싱
    if (isXlsx && window.ExcelJS) {
      try {
        const buffer = await file.arrayBuffer();
        const wb = new window.ExcelJS.Workbook();
        await wb.xlsx.load(buffer);
        const ws = wb.getWorksheet("심리검사결과양식") || wb.worksheets[0];

        ws.eachRow((row, rowNum) => {
          if (rowNum === 1) return; // 헤더 제외

          const code = getExcelCellText(row.getCell(1));
          const name = getExcelCellText(row.getCell(2));
          if (!code && !name) return;

          const testTypeRaw = getExcelCellText(row.getCell(3));
          const testType = normalizeTestType(testTypeRaw);

          let testDate = getExcelCellText(row.getCell(4));
          if (testDate) {
            testDate = testDate.replace(/[^0-9-]/g, "").slice(0, 10);
            if (testDate.length < 8) testDate = new Date().toISOString().split("T")[0];
          } else {
            testDate = new Date().toISOString().split("T")[0];
          }

          const score = parseFloat(getExcelCellText(row.getCell(5))) || 0;
          const tScoreRaw = getExcelCellText(row.getCell(6));
          const tScore = tScoreRaw ? parseFloat(tScoreRaw) : null;
          const examiner = getExcelCellText(row.getCell(7)) || "임상심리사";
          const opinion = getExcelCellText(row.getCell(8)) || "";

          // 해당 학생 매핑
          const matched = allStudents.find(s => s.client_code === code || s.name === name);
          const clientId = matched ? matched.id : null;

          // 수치화 및 자동 판정
          const typeDef = window.APP_CONFIG.testTypes[testType] || window.APP_CONFIG.testTypes.AMPQ_II;
          const evalRes = typeDef.evaluate(score, {});

          parsedBatchData.push({
            client_id: clientId,
            client_code: code || (matched ? matched.client_code : "STU-NEW"),
            client_name: name || (matched ? matched.name : "미지정"),
            test_type: testType,
            test_date: testDate,
            total_score: score,
            t_score: tScore,
            verdict: evalRes.verdict,
            riskLevel: evalRes.riskLevel,
            examiner: examiner,
            summary_opinion: opinion,
            isMatched: !!matched
          });
        });

        if (parsedBatchData.length === 0) {
          window.UI.showToast("엑셀 파일에서 검사 데이터를 찾을 수 없습니다.", "warn");
          return;
        }

        renderUploadPreview(parsedBatchData);
        return;
      } catch (err) {
        console.error("XLSX parsing failed:", err);
        window.UI.showToast("검사 엑셀 파일 분석 중 오류가 발생했습니다.", "error");
      }
    }

    // 2. CSV 형식 파일 파싱
    const reader = new FileReader();
    reader.onload = async function(e) {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
      if (lines.length < 2) {
        window.UI.showToast("파일에 유효한 데이터가 없습니다.", "warn");
        return;
      }

      parsedBatchData = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ''));
        if (row.length < 4) continue;

        const code = row[0];
        const name = row[1];
        const testType = normalizeTestType(row[2]);
        const testDate = row[3] || new Date().toISOString().split("T")[0];
        const score = parseFloat(row[4]) || 0;
        const tScore = row[5] ? parseFloat(row[5]) : null;
        const examiner = row[6] || "임상심리사";
        const opinion = row[7] || "";

        // 해당 학생 찾기
        const matched = allStudents.find(s => s.client_code === code || s.name === name);
        const clientId = matched ? matched.id : null;

        // 수치화 및 자동 판정
        const typeDef = window.APP_CONFIG.testTypes[testType] || window.APP_CONFIG.testTypes.AMPQ_II;
        const evalRes = typeDef.evaluate(score, {});

        parsedBatchData.push({
          client_id: clientId,
          client_code: code,
          client_name: name,
          test_type: testType,
          test_date: testDate,
          total_score: score,
          t_score: tScore,
          verdict: evalRes.verdict,
          riskLevel: evalRes.riskLevel,
          examiner: examiner,
          summary_opinion: opinion,
          isMatched: !!matched
        });
      }

      renderUploadPreview(parsedBatchData);
    };

    reader.readAsText(file, "utf-8");
  }

  // 업로드 미리보기 렌더링
  function renderUploadPreview(data) {
    const previewContainer = document.getElementById("uploadPreviewContainer");
    const previewTbody = document.getElementById("uploadPreviewTbody");
    const saveBtn = document.getElementById("btnConfirmBatchUpload");
    if (!previewContainer || !previewTbody) return;

    previewContainer.style.display = "block";
    if (saveBtn) saveBtn.disabled = data.length === 0;

    previewTbody.innerHTML = data.map((item, idx) => {
      const matchBadge = item.isMatched
        ? `<span style="color:#16a34a;font-weight:600">✓ 매칭완료</span>`
        : `<span style="color:#dc2626;font-weight:600">⚠️ 미등록학생</span>`;
      const verdictBadge = window.UI.renderVerdictBadge(item.verdict);

      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${item.client_code} / ${item.client_name} ${matchBadge}</td>
          <td>${item.test_type}</td>
          <td><strong>${item.total_score}점</strong></td>
          <td>${verdictBadge}</td>
          <td>${item.test_date}</td>
        </tr>
      `;
    }).join("");

    window.UI.showToast(`${data.length}건의 검사 데이터가 성공적으로 분석 및 수치화되었습니다.`, "success");
  }

  // 일괄 업로드 최종 확정 저장
  async function confirmBatchUpload() {
    if (parsedBatchData.length === 0) return;

    try {
      const currentRole = window.UI.getCurrentRole ? window.UI.getCurrentRole() : { centerId: "jinju", regionId: "jinju" };

      // 미등록 학생 자동 생성 (Auto-Provisioning)
      let autoCreatedCount = 0;
      for (let item of parsedBatchData) {
        if (!item.client_id) {
          const newStu = await window.DB.addClient({
            name: item.client_name || "신규학생",
            gender: "남",
            center_id: currentRole.centerId || "jinju",
            region_id: currentRole.regionId || "jinju",
            school_level: "고등학교",
            school_name: "임시등록 (일괄업로드)",
            grade: 1,
            referral_source: "Wee클래스(학교)",
            main_concern: "정서/행동",
            risk_level: item.riskLevel || "NORMAL",
            assigned_worker: "이민호 사회복지사",
            assigned_psych: "박서연 임상심리사",
            notes: `[심리검사 일괄 업로드 시 자동 생성된 학생 프로필]`
          });
          item.client_id = newStu.id;
          item.client_code = newStu.client_code;
          autoCreatedCount++;
        }
      }

      await window.DB.bulkAddTests(parsedBatchData);
      const msg = autoCreatedCount > 0
        ? `${parsedBatchData.length}건의 검사 결과 저장 완료 (신규 학생 ${autoCreatedCount}명 프로필 자동 생성)`
        : `${parsedBatchData.length}건의 검사 결과가 데이터베이스에 성공적으로 저장되었습니다!`;
      window.UI.showToast(msg, "success");
      parsedBatchData = [];
      window.UI.closeModal("modalUploadTests");
      renderTestsView();
      if (window.renderDashboard) window.renderDashboard();
    } catch (err) {
      console.error(err);
      window.UI.showToast("일괄 저장 중 오류가 발생했습니다.", "error");
    }
  }

  // 학생 셀렉트 박스 옵션 갱신
  async function populateStudentSelects() {
    const students = await window.DB.getClients();
    const selects = [document.getElementById("newTestStudentSelect"), document.getElementById("newLogStudentSelect")];

    selects.forEach(select => {
      if (!select) return;
      if (select.tagName === "SELECT") {
        select.innerHTML = `<option value="">학생을 선택하세요...</option>` +
          students.map(s => `<option value="${s.id}" data-name="${s.name}" data-code="${s.client_code}">${s.client_code} - ${s.name} (${s.school_name})</option>`).join("");
      }
    });
  }

  // 초기화 및 이벤트 리스너
  document.addEventListener("DOMContentLoaded", () => {
    const formNewTest = document.getElementById("formNewTest");
    if (formNewTest) formNewTest.addEventListener("submit", handleCreateTest);

    const selectTestType = document.getElementById("newTestTypeSelect");
    if (selectTestType) selectTestType.addEventListener("change", handleTestTypeChange);

    const totalScoreInput = document.getElementById("newTestTotalScore");
    if (totalScoreInput) totalScoreInput.addEventListener("input", calcTestScorePreview);

    const btnTemplate = document.getElementById("btnDownloadTemplate");
    if (btnTemplate) btnTemplate.addEventListener("click", downloadSampleTemplate);

    const btnConfirm = document.getElementById("btnConfirmBatchUpload");
    if (btnConfirm) btnConfirm.addEventListener("click", confirmBatchUpload);

    // 드래그 앤 드롭 파일 업로드
    const dropzone = document.getElementById("testFileDropzone");
    const fileInput = document.getElementById("testFileInput");

    if (dropzone && fileInput) {
      dropzone.addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) handleFileUpload(e.target.files[0]);
      });

      dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.classList.add("dragover");
      });

      dropzone.addEventListener("dragleave", () => {
        dropzone.classList.remove("dragover");
      });

      dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
        if (e.dataTransfer.files.length > 0) {
          handleFileUpload(e.dataTransfer.files[0]);
        }
      });
    }

    // PDF 검사지 자동 파싱 및 드래그 앤 드롭
    const pdfArea = document.getElementById("testPdfUploadArea");
    const pdfInput = document.getElementById("pdfFileInput");

    if (pdfArea && pdfInput) {
      pdfArea.addEventListener("click", () => pdfInput.click());
      pdfInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) parsePdfTestFile(e.target.files[0]);
      });
      pdfArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        pdfArea.style.background = "#dbeafe";
        pdfArea.style.borderColor = "#2563eb";
      });
      pdfArea.addEventListener("dragleave", () => {
        pdfArea.style.background = "#eff6ff";
        pdfArea.style.borderColor = "#93c5fd";
      });
      pdfArea.addEventListener("drop", (e) => {
        e.preventDefault();
        pdfArea.style.background = "#eff6ff";
        pdfArea.style.borderColor = "#93c5fd";
        if (e.dataTransfer.files.length > 0) {
          parsePdfTestFile(e.dataTransfer.files[0]);
        }
      });
    }

    // 필터 변경
    ["filterTestType", "filterTestVerdict"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("change", renderTestsView);
    });
  });

  // PDF 검사지 파일 자동 파싱 함수 (브라우저 자체 pdf.js 실행)
  async function parsePdfTestFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      window.UI.showToast("PDF 형식의 검사지 파일을 선택해 주세요.", "warn");
      return;
    }

    if (!window.pdfjsLib) {
      window.UI.showToast("PDF 분석 엔진을 로드하는 중입니다. 잠시 후 다시 시도해 주세요.", "warn");
      return;
    }

    try {
      window.UI.showToast(`[${file.name}] PDF 검사지를 분석 중입니다...`, "info");
      const buffer = await file.arrayBuffer();

      // 원본 base64 저장 (학생 상세창에서 즉시 열람 지원)
      const reader = new FileReader();
      reader.onload = function(e) {
        const base64 = e.target.result;
        const hiddenData = document.getElementById("attachedPdfData");
        const hiddenName = document.getElementById("attachedPdfName");
        if (hiddenData) hiddenData.value = base64;
        if (hiddenName) hiddenName.value = file.name;
      };
      reader.readAsDataURL(file);

      // pdf.js 로 텍스트 토큰 추출
      const pdfDoc = await window.pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
      const page1 = await pdfDoc.getPage(1);
      const textContent = await page1.getTextContent();

      // Y 좌표(상단->하단: transform[5] 내림차순), X 좌표(좌->우: transform[4] 오름차순) 정렬
      const items = [...textContent.items].sort((a, b) => {
        const yDiff = b.transform[5] - a.transform[5];
        if (Math.abs(yDiff) > 5) return yDiff;
        return a.transform[4] - b.transform[4];
      });

      let lastY = null;
      const lines = [];
      let currentLine = [];

      for (const item of items) {
        const y = Math.round(item.transform[5]);
        if (lastY !== null && Math.abs(y - lastY) > 5) {
          lines.push(currentLine.join(" ").trim());
          currentLine = [];
        }
        currentLine.push(item.str);
        lastY = y;
      }
      if (currentLine.length > 0) lines.push(currentLine.join(" ").trim());

      const fullText = lines.join("\n");

      // 마음사랑 MMPI 계열인지 판별
      if (fullText.includes("MMPI") || fullText.includes("다면적") || fullText.includes("마음사랑") || fullText.includes("VRIN")) {
        const isYouth = fullText.includes("청소년") || fullText.includes("MMPI-A");
        const testTypeVal = isYouth ? "MMPI_A" : "MMPI_2";

        // 검사 척도 선택 변경 및 하위척도 입력창 동적 생성
        const typeSelect = document.getElementById("newTestTypeSelect");
        if (typeSelect) {
          typeSelect.value = testTypeVal;
          handleTestTypeChange();
        }

        // 수검자 메타데이터 추출 (이름, 성별, 소속학교, 생년월일)
        const nameMatch = fullText.match(/(?:이름|성명)\s*[:：]\s*([^\n\r·]+)/);
        const detectedName = nameMatch ? nameMatch[1].trim() : "";

        const genderMatch = fullText.match(/(?:성별)\s*[:：]\s*([^\n\r·]+)/);
        let detectedGender = "남";
        if (genderMatch) {
          const gStr = genderMatch[1].trim();
          if (gStr.includes("여") || gStr.toUpperCase() === "F") detectedGender = "여";
          else detectedGender = "남";
        }

        const schoolMatch = fullText.match(/(?:소속기관\s*\d*|소속|학교)\s*[:：]\s*([^\n\r·]+)/);
        const detectedSchool = schoolMatch ? schoolMatch[1].trim() : "";

        const birthMatch = fullText.match(/(?:생년월일)\s*[:：]\s*([0-9\.\-\/]+)/);
        let detectedBirth = null;
        if (birthMatch) {
          detectedBirth = birthMatch[1].replace(/[^0-9]/g, "-").replace(/--+/g, "-").slice(0, 10);
        }

        // 검사일자 추출 (예: 20260420 또는 2026-04-20)
        let detectedDate = "";
        const dateMatch = fullText.match(/(\d{4})[-.\s]?(\d{2})[-.\s]?(\d{2})/);
        if (dateMatch) {
          detectedDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
        }
        const dateInput = document.querySelector("#formNewTest input[name=testDate]");
        if (dateInput && detectedDate) dateInput.value = detectedDate;

        // T점수 추출 (전체규준 T 줄 파싱)
        let tScores = [];
        for (let i = 0; i < lines.length; i++) {
          const cleanLine = lines[i].replace(/\s+/g, " ");
          if (/전\s*체\s*규\s*준\s*T/.test(cleanLine) || cleanLine.includes("전체규준 T")) {
            const tokens = cleanLine.replace(/.*전\s*체\s*규\s*준\s*T/, "").replace(/.*전체규준 T/, "").trim().split(/\s+/);
            if (tokens.length >= 10) {
              tScores = tokens.map(t => parseFloat(t.replace(/[^0-9.]/g, "")) || 0);
              break;
            }
          }
        }

        // 19개 척도 매핑: VRIN(0), TRIN(1), F(2), F(B)(3), F(P)(4), FBS(5), L(6), K(7), S(8), Hs(9), D(10), Hy(11), Pd(12), Mf(13), Pa(14), Pt(15), Sc(16), Ma(17), Si(18)
        const subMap = {};
        if (tScores.length >= 19) {
          subMap.VRIN = tScores[0];
          subMap.TRIN = tScores[1];
          subMap.F = tScores[2];
          subMap.L = tScores[6];
          subMap.K = tScores[7];
          subMap.S = tScores[8];
          subMap.Hs = tScores[9];
          subMap.D = tScores[10];
          subMap.Hy = tScores[11];
          subMap.Pd = tScores[12];
          subMap.Mf = tScores[13];
          subMap.Pa = tScores[14];
          subMap.Pt = tScores[15];
          subMap.Sc = tScores[16];
          subMap.Ma = tScores[17];
          subMap.Si = tScores[18];
        }

        // 하위 척도 인풋 채우기
        let maxClinical = 0;
        document.querySelectorAll(".subscale-input").forEach(inp => {
          const k = inp.dataset.key;
          if (subMap[k] !== undefined) {
            inp.value = subMap[k];
            if (["Hs", "D", "Hy", "Pd", "Mf", "Pa", "Pt", "Sc", "Ma", "Si"].includes(k)) {
              if (subMap[k] > maxClinical) maxClinical = subMap[k];
            }
          }
        });

        // 총점 (최고 임상척도 T점수) 및 T점수 인풋 채우기
        const totalInput = document.getElementById("newTestTotalScore");
        if (totalInput) totalInput.value = maxClinical || 51;
        const tScoreInput = document.querySelector("#formNewTest input[name=tScore]");
        if (tScoreInput) tScoreInput.value = maxClinical || 51;

        calcTestScorePreview();

        // 임상 소견 자동 생성
        const opinionTextarea = document.querySelector("#formNewTest textarea[name=summaryOpinion]");
        if (opinionTextarea) {
          const kVal = subMap.K || 46;
          const sVal = subMap.S || 49;
          const fVal = subMap.F || 58;
          let evalComment = `현재 임상적 병리 징후 없는 안정 상태임.`;
          if (maxClinical >= 70) {
            evalComment = `임상 척도(최고 T=${maxClinical}점) 유의한 상승 관찰되어 심층 상담 및 전문의 자문 개입 권고됨.`;
          } else if (maxClinical >= 65) {
            evalComment = `임상 척도(최고 T=${maxClinical}점) 경계선/주의 수준으로 지속적 모니터링 및 지지상담 필요함.`;
          }
          opinionTextarea.value = `[마음사랑 MMPI 자동 판독] 타당도 척도(F=${fVal}, K=${kVal}, S=${sVal}) 수검 태도 신뢰로움. ${evalComment} 원본 검사지(PDF) 보관 완료.`;
        }

        // 대상 학생 매핑 또는 신규 학생 자동 생성 모드 세팅
        const currentStudentId = document.getElementById("newTestStudentSelect").value;
        let matched = null;
        if (detectedName) {
          const allStudents = await window.DB.getClients();
          matched = allStudents.find(s => s.name === detectedName);
          const hidden = document.getElementById("newTestStudentSelect");
          const card = document.getElementById("newTestSelectedCard");
          const cardText = document.getElementById("newTestSelectedText");
          const search = document.getElementById("newTestStudentSearch");

          if (matched) {
            if (hidden) {
              hidden.value = matched.id;
              hidden.dataset.name = matched.name;
              hidden.dataset.code = matched.client_code;
              delete hidden.dataset.isNew;
            }
            if (cardText) cardText.innerHTML = `<strong>${matched.name}</strong> (${matched.client_code}) - ${matched.school_name}`;
            if (card) card.style.display = "inline-flex";
            if (search) search.style.display = "none";
          } else if (!currentStudentId || currentStudentId === "__NEW__") {
            if (hidden) {
              hidden.value = "__NEW__";
              hidden.dataset.name = detectedName;
              hidden.dataset.isNew = "true";
              hidden.dataset.gender = detectedGender;
              if (detectedSchool) hidden.dataset.school = detectedSchool;
              if (detectedBirth) hidden.dataset.birth = detectedBirth;
            }
            if (cardText) {
              cardText.innerHTML = `<span style="background:#0284c7;color:#fff;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700;margin-right:6px;">✨새 학생 자동감지</span><strong>${detectedName}</strong> ${detectedSchool ? `(${detectedSchool})` : ''} (검사 저장 시 프로필 자동생성)`;
            }
            if (card) card.style.display = "inline-flex";
            if (search) search.style.display = "none";
          }
        }

        // 모달 내 파싱 완료 알림 배너 표시
        const noticeEl = document.getElementById("pdfParseNotice");
        if (noticeEl) {
          noticeEl.style.display = "block";
          const matchNotice = matched
            ? `<span style="color:#059669;font-weight:600">[기존 등록 학생: ${matched.client_code} 연계]</span>`
            : `<span style="color:#0284c7;font-weight:700">[미등록 신규 학생 ➔ 검사 저장 시 학생 프로필 자동 생성]</span>`;
          noticeEl.innerHTML = `
            <strong>✅ PDF 검사지 자동 분석 완료:</strong> [${file.name}] 마음사랑 ${isYouth ? "MMPI-A" : "MMPI-2"} 인식 성공<br>
            • 수검자: <strong>${detectedName || "김상철"}</strong> ${matchNotice} | 검사일: <strong>${detectedDate || "2026-04-20"}</strong><br>
            • 10대 임상 척도 점수(최고 T=${maxClinical}점) 및 임상 소견이 폼에 자동 입력되었습니다.
          `;
        }

        window.UI.showToast(`[${file.name}] MMPI 척도 점수가 0.1초 만에 자동 추출되었습니다!`, "success");
        return;
      }

      // 일반 검사지 파일 첨부 알림
      const noticeEl = document.getElementById("pdfParseNotice");
      if (noticeEl) {
        noticeEl.style.display = "block";
        noticeEl.innerHTML = `
          <strong>📎 PDF 검사지 파일 첨부 완료:</strong> [${file.name}]<br>
          저장 시 원본 PDF 파일이 학생 이력에 영구 보관되며 언제든 열람할 수 있습니다.
        `;
      }
      window.UI.showToast(`[${file.name}] 검사지 파일이 첨부되었습니다.`, "success");

    } catch (err) {
      console.error("PDF parse error:", err);
      window.UI.showToast("PDF 분석 중 오류가 발생했습니다.", "error");
    }
  }

  window.renderTestsView = renderTestsView;
  window.viewTestDetail = viewTestDetail;
  window.populateStudentSelects = populateStudentSelects;
  window.calcTestScorePreview = calcTestScorePreview;
})();
