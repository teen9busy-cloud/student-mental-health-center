// ==============================================================================
// 경상남도교육청 학생정신건강 전담센터 - 대시보드 및 통계 분석 모듈
// ==============================================================================

(function() {
  // 대시보드 메인 렌더링
  async function renderDashboard() {
    const stats = await window.DB.getAggregatedStats();
    const students = await window.DB.getClients();

    // 1. KPI 카드 업데이트
    const elTotal = document.getElementById("kpiTotalStudents");
    const elSevere = document.getElementById("kpiSevereCount");
    const elModerate = document.getElementById("kpiModerateCount");
    const elTests = document.getElementById("kpiTotalTests");
    const elLogs = document.getElementById("kpiTotalLogs");

    if (elTotal) elTotal.textContent = `${stats.totalStudents}명`;
    if (elSevere) elSevere.textContent = `${stats.riskDistribution.severe}명`;
    if (elModerate) elModerate.textContent = `${stats.riskDistribution.moderate}명`;
    if (elTests) elTests.textContent = `${stats.totalTests}건`;
    if (elLogs) elLogs.textContent = `${stats.totalLogs}회`;

    // 2. 고위험군 긴급 알림 배너
    const crisisBanner = document.getElementById("dashboardCrisisBanner");
    const crisisCountEl = document.getElementById("crisisBannerCount");
    if (crisisBanner && crisisCountEl) {
      if (stats.riskDistribution.severe > 0) {
        crisisBanner.style.display = "flex";
        crisisCountEl.textContent = `${stats.riskDistribution.severe}명`;
      } else {
        crisisBanner.style.display = "none";
      }
    }

    // 3. 고위험군(위기 학생) 긴급 리스트 테이블
    const severeTbody = document.getElementById("severeStudentsTbody");
    if (severeTbody) {
      const severeStudents = students.filter(s => s.risk_level === "SEVERE");
      if (severeStudents.length === 0) {
        severeTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:16px;color:var(--text-sub)">현재 등록된 고위험군 위기 학생이 없습니다.</td></tr>`;
      } else {
        severeTbody.innerHTML = severeStudents.map(s => {
          const reg = window.APP_CONFIG.regions.find(r => r.id === s.region_id);
          return `
            <tr>
              <td><strong style="color:var(--risk-severe)">${s.client_code}</strong></td>
              <td><strong>${s.name}</strong> (${s.gender})</td>
              <td>${reg ? reg.name : s.region_id} / ${s.school_name}</td>
              <td><span style="color:#b91c1c;font-weight:600">${s.main_concern}</span></td>
              <td>
                <button class="btn btn-outline btn-sm" onclick="window.viewStudentDetail('${s.id}')">즉시 확인</button>
              </td>
            </tr>
          `;
        }).join("");
      }
    }

    // 4. 대시보드 간이 지역별 바 차트
    renderDashboardRegionBars(stats.regionDistribution);
  }

  // 대시보드 지역별 현황 막대 그래프
  function renderDashboardRegionBars(regionDist) {
    const container = document.getElementById("dashboardRegionBars");
    if (!container) return;

    const entries = Object.entries(regionDist).filter(([_, count]) => count > 0);
    const maxVal = Math.max(...entries.map(e => e[1]), 1);

    if (entries.length === 0) {
      container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-sub)">등록된 지역 데이터가 없습니다.</div>`;
      return;
    }

    container.innerHTML = entries.map(([name, count]) => {
      const pct = Math.round((count / maxVal) * 100);
      return `
        <div class="bar-row">
          <div class="bar-meta">
            <span>${name}</span>
            <span>${count}명</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${pct}%;background:var(--primary)"></div>
          </div>
        </div>
      `;
    }).join("");
  }

  // 통계 탭 전체 렌더링
  async function renderStatsView() {
    const centerFilter = document.getElementById("statsCenterFilter") ? document.getElementById("statsCenterFilter").value : "all";
    const stats = await window.DB.getAggregatedStats(centerFilter);
    const students = await window.DB.getClients({ center_id: centerFilter });
    const tests = await window.DB.getTests();

    // 1. 위기도 분포 바
    const riskBarsEl = document.getElementById("statsRiskBars");
    if (riskBarsEl) {
      const total = stats.totalStudents || 1;
      const r = stats.riskDistribution;
      riskBarsEl.innerHTML = `
        <div class="bar-row">
          <div class="bar-meta"><span>🚨 고위험군 (위기)</span><span>${r.severe}명 (${Math.round(r.severe/total*100)}%)</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${(r.severe/total)*100}%;background:var(--risk-severe)"></div></div>
        </div>
        <div class="bar-row">
          <div class="bar-meta"><span>⚠️ 주의군 (전문상담 필요)</span><span>${r.moderate}명 (${Math.round(r.moderate/total*100)}%)</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${(r.moderate/total)*100}%;background:var(--risk-moderate)"></div></div>
        </div>
        <div class="bar-row">
          <div class="bar-meta"><span>ℹ️ 관심군</span><span>${r.mild}명 (${Math.round(r.mild/total*100)}%)</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${(r.mild/total)*100}%;background:var(--risk-mild)"></div></div>
        </div>
        <div class="bar-row">
          <div class="bar-meta"><span>✅ 일반군 (정상)</span><span>${r.normal}명 (${Math.round(r.normal/total*100)}%)</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${(r.normal/total)*100}%;background:var(--risk-normal)"></div></div>
        </div>
      `;
    }

    // 2. 학교급별/위험군 교차분석 테이블
    const crossTbody = document.getElementById("statsCrossTbody");
    if (crossTbody) {
      const levels = ["초등학교", "중학교", "고등학교"];
      crossTbody.innerHTML = levels.map(lvl => {
        const list = students.filter(s => s.school_level === lvl);
        const totalLvl = list.length;
        const sev = list.filter(s => s.risk_level === "SEVERE").length;
        const mod = list.filter(s => s.risk_level === "MODERATE").length;
        const mil = list.filter(s => s.risk_level === "MILD").length;
        const nor = list.filter(s => s.risk_level === "NORMAL").length;

        return `
          <tr>
            <td><strong>${lvl}</strong></td>
            <td><strong>${totalLvl}명</strong></td>
            <td><span style="color:var(--risk-severe);font-weight:700">${sev}</span></td>
            <td><span style="color:var(--risk-moderate);font-weight:600">${mod}</span></td>
            <td><span style="color:var(--risk-mild);font-weight:600">${mil}</span></td>
            <td><span style="color:var(--risk-normal);font-weight:600">${nor}</span></td>
          </tr>
        `;
      }).join("");
    }

    // 3. 주 호소문제별 분포
    const concernBarsEl = document.getElementById("statsConcernBars");
    if (concernBarsEl) {
      const entries = Object.entries(stats.concernStats).sort((a, b) => b[1] - a[1]);
      const maxVal = Math.max(...entries.map(e => e[1]), 1);

      concernBarsEl.innerHTML = entries.map(([concern, count]) => {
        const pct = Math.round((count / maxVal) * 100);
        return `
          <div class="bar-row">
            <div class="bar-meta"><span>${concern}</span><span>${count}명</span></div>
            <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:var(--secondary)"></div></div>
          </div>
        `;
      }).join("");
    }

    // 4. 사전-사후 검사 점수 변화 추이 (효과성 평가)
    const prePostEl = document.getElementById("statsPrePostContainer");
    if (prePostEl) {
      // 2회 이상 검사받은 학생 추출
      const studentTestMap = {};
      tests.forEach(t => {
        if (!studentTestMap[t.client_id]) studentTestMap[t.client_id] = [];
        studentTestMap[t.client_id].push(t);
      });

      const multiTestStudents = Object.keys(studentTestMap).filter(id => studentTestMap[id].length >= 2);

      if (multiTestStudents.length === 0) {
        prePostEl.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-sub)">2회 이상 심리검사를 시행한 학생의 추적 데이터가 아직 충분하지 않습니다.</div>`;
      } else {
        prePostEl.innerHTML = multiTestStudents.map(sId => {
          const sTests = studentTestMap[sId].sort((a, b) => new Date(a.test_date) - new Date(b.test_date));
          const pre = sTests[0];
          const post = sTests[sTests.length - 1];
          const student = students.find(s => s.id === sId) || { name: pre.client_name, client_code: pre.client_code };
          const diff = pre.total_score - post.total_score;
          const isImproved = diff > 0;

          return `
            <div style="background:#f8fafc;border:1px solid var(--line);border-radius:8px;padding:14px;margin-bottom:12px">
              <div style="display:flex;justify-content:space-between;margin-bottom:8px">
                <strong>${student.name} (${student.client_code}) - ${pre.test_type}</strong>
                <span class="badge ${isImproved ? 'badge-normal' : 'badge-severe'}">
                  ${isImproved ? `📉 위험도 점수 ${Math.abs(diff)}점 감소 (호전)` : `점수 변동: ${diff}점`}
                </span>
              </div>
              <div style="display:flex;align-items:center;gap:14px;font-size:14px">
                <div>사전검사 (${pre.test_date}): <strong>${pre.total_score}점</strong> (${pre.verdict})</div>
                <div style="font-size:18px;color:var(--text-muted)">➔</div>
                <div>사후검사 (${post.test_date}): <strong style="color:var(--primary)">${post.total_score}점</strong> (${post.verdict})</div>
              </div>
            </div>
          `;
        }).join("");
      }
    }
  }

  // 교육청 보고서용 실적표 CSV 내보내기
  async function exportEducationOfficeReport() {
    const stats = await window.DB.getAggregatedStats();
    const students = await window.DB.getClients();
    const tests = await window.DB.getTests();
    const logs = await window.DB.getMonitoringLogs();

    let csv = "\uFEFF[경상남도교육청 학생정신건강 전담센터 사업 실적 보고서]\n";
    csv += `출력일시,${new Date().toLocaleString("ko-KR")}\n`;
    csv += `총 관리 학생수,${stats.totalStudents}명\n`;
    csv += `총 심리검사 건수,${stats.totalTests}건\n`;
    csv += `총 모니터링 상담 회기,${stats.totalLogs}회\n\n`;

    csv += "1. 위기도별 학생 현황\n";
    csv += "구분,인원수(명),비율(%)\n";
    const total = stats.totalStudents || 1;
    csv += `고위험군 (위기),${stats.riskDistribution.severe},${((stats.riskDistribution.severe/total)*100).toFixed(1)}%\n`;
    csv += `주의군,${stats.riskDistribution.moderate},${((stats.riskDistribution.moderate/total)*100).toFixed(1)}%\n`;
    csv += `관심군,${stats.riskDistribution.mild},${((stats.riskDistribution.mild/total)*100).toFixed(1)}%\n`;
    csv += `일반군,${stats.riskDistribution.normal},${((stats.riskDistribution.normal/total)*100).toFixed(1)}%\n\n`;

    csv += "2. 경상남도 18개 시·군별 학생 현황\n";
    csv += "지역명,관할센터,관리 학생수(명)\n";
    window.APP_CONFIG.regions.forEach(r => {
      const count = stats.regionDistribution[r.name] || 0;
      const center = r.centerId === "jinju" ? "진주(서부)" : "창원(동부)";
      csv += `${r.name},${center},${count}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `경남교육청_학생정신건강전담센터_실적보고서_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.UI.showToast("교육청 제출용 실적 보고서가 다운로드되었습니다.", "success");
  }

  // 초기화 및 이벤트 리스너
  document.addEventListener("DOMContentLoaded", () => {
    const centerFilter = document.getElementById("statsCenterFilter");
    if (centerFilter) centerFilter.addEventListener("change", renderStatsView);

    const btnExport = document.getElementById("btnExportReport");
    if (btnExport) btnExport.addEventListener("click", exportEducationOfficeReport);
  });

  window.renderDashboard = renderDashboard;
  window.renderStatsView = renderStatsView;
  window.exportEducationOfficeReport = exportEducationOfficeReport;
})();
