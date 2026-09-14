// ==============================================================================
// 경상남도교육청 학생정신건강 전담센터 - 모니터링 및 상담 일지 모듈
// ==============================================================================

(function() {
  // 모니터링 목록 렌더링
  async function renderMonitoringView() {
    const tbody = document.getElementById("monitoringTableBody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted)">상담/모니터링 기록을 불러오는 중입니다...</td></tr>`;

    const contactFilter = document.getElementById("filterContactType") ? document.getElementById("filterContactType").value : "all";

    const logs = await window.DB.getMonitoringLogs();
    let filtered = logs;
    if (contactFilter !== "all") {
      filtered = filtered.filter(l => l.contact_type === contactFilter);
    }

    const countElem = document.getElementById("monitoringTotalCount");
    if (countElem) countElem.textContent = `${filtered.length}건`;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-sub)">등록된 모니터링 일지가 없습니다.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(l => {
      const cType = window.APP_CONFIG.contactTypes[l.contact_type] || { label: l.contact_type, icon: "📝" };
      const riskBadge = window.UI.renderRiskBadge(l.current_risk);

      return `
        <tr>
          <td>${l.session_date}</td>
          <td><strong>${l.client_name || "이름미기재"}</strong></td>
          <td><span style="font-weight:600">${cType.icon} ${cType.label}</span></td>
          <td><span class="badge" style="background:#f1f5f9;color:var(--text-main)">제${l.session_no || 1}회기</span></td>
          <td>${riskBadge}</td>
          <td>
            <div style="font-weight:600;font-size:13.5px;max-width:320px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              ${l.session_summary}
            </div>
            ${l.doctor_opinion ? `<div style="font-size:12px;color:#1e40af;margin-top:2px">🩺 전문의 자문 완료</div>` : ""}
          </td>
          <td>${l.worker || "사회복지사"}</td>
        </tr>
      `;
    }).join("");
  }

  // 모니터링 일지 작성 제출
  async function handleCreateMonitoring(e) {
    e.preventDefault();
    const form = e.target;
    const studentSelect = form.studentSelect;
    const studentId = studentSelect ? studentSelect.value : "";

    if (!studentId) {
      window.UI.showToast("대상 학생을 검색창에서 찾아 선택해 주세요.", "warn");
      return;
    }

    let studentName = studentSelect.dataset ? studentSelect.dataset.name : "";
    if (!studentName) {
      const client = await window.DB.getClientById(studentId);
      if (client) studentName = client.name;
    }

    const logRecord = {
      client_id: studentId,
      client_name: studentName,
      session_date: form.sessionDate.value || new Date().toISOString().split("T")[0],
      session_no: parseInt(form.sessionNo.value, 10) || 1,
      contact_type: form.contactType.value,
      current_risk: form.currentRisk.value,
      worker: form.workerName.value.trim() || window.UI.getCurrentRole().name,
      session_summary: form.sessionSummary.value.trim(),
      student_status: form.studentStatus.value.trim(),
      intervention_details: form.interventionDetails.value.trim(),
      doctor_opinion: form.doctorOpinion.value.trim() || null,
      next_schedule: form.nextSchedule.value || null
    };

    if (!logRecord.session_summary) {
      window.UI.showToast("상담 요약을 입력해 주세요.", "warn");
      return;
    }

    try {
      await window.DB.addMonitoringLog(logRecord);
      window.UI.showToast(`[${studentName}] 모니터링 일지가 성공적으로 등록되었습니다.`, "success");
      form.reset();
      if (window.clearSelectedLogStudent) window.clearSelectedLogStudent();
      window.UI.closeModal("modalNewMonitoring");
      renderMonitoringView();
      if (window.renderDashboard) window.renderDashboard();
    } catch (err) {
      console.error(err);
      window.UI.showToast("모니터링 일지 등록 중 오류가 발생했습니다.", "error");
    }
  }

  // 초기화 및 이벤트 리스너
  document.addEventListener("DOMContentLoaded", () => {
    const formNewLog = document.getElementById("formNewMonitoring");
    if (formNewLog) formNewLog.addEventListener("submit", handleCreateMonitoring);

    const filterEl = document.getElementById("filterContactType");
    if (filterEl) filterEl.addEventListener("change", renderMonitoringView);
  });

  window.renderMonitoringView = renderMonitoringView;
})();
