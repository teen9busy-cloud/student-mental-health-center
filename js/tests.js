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
            <button class="btn btn-outline btn-sm" onclick="window.viewTestDetail('${t.id}')">소견/상세</button>
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
    const studentId = studentSelect ? studentSelect.value : "";
    if (!studentId) {
      window.UI.showToast("검사 대상 학생을 검색창에서 찾아 선택해 주세요.", "warning");
      return;
    }

    let studentName = studentSelect.dataset ? studentSelect.dataset.name : "";
    let studentCode = studentSelect.dataset ? studentSelect.dataset.code : "";

    if (!studentName || !studentCode) {
      const client = await window.DB.getClientById(studentId);
      if (client) {
        studentName = client.name;
        studentCode = client.client_code || client.code;
      }
    }

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
      summary_opinion: opinion
    };

    try {
      await window.DB.addTest(testRecord);
      window.UI.showToast(`[${studentName}] 심리검사 등록 및 수치화가 완료되었습니다.`, "success");
      form.reset();
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
      await window.DB.bulkAddTests(parsedBatchData);
      window.UI.showToast(`${parsedBatchData.length}건의 검사 결과가 데이터베이스에 성공적으로 저장되었습니다!`, "success");
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
      select.innerHTML = `<option value="">학생을 선택하세요...</option>` +
        students.map(s => `<option value="${s.id}" data-name="${s.name}" data-code="${s.client_code}">${s.client_code} - ${s.name} (${s.school_name})</option>`).join("");
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

    // 필터 변경
    ["filterTestType", "filterTestVerdict"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("change", renderTestsView);
    });
  });

  window.renderTestsView = renderTestsView;
  window.viewTestDetail = viewTestDetail;
  window.populateStudentSelects = populateStudentSelects;
  window.calcTestScorePreview = calcTestScorePreview;
})();
