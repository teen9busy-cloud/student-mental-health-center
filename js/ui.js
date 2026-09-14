// ==============================================================================
// 경상남도교육청 학생정신건강 전담센터 - 공통 UI 제어 모듈
// ==============================================================================

window.UI = (function() {
  let currentRole = window.APP_CONFIG.demoRoles[0]; // 기본: 센터장(의사)
  let activeTab = "dashboard";

  // 토스트 메시지
  function showToast(message, type = "info") {
    let container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    let icon = "ℹ️";
    if (type === "success") icon = "✅";
    if (type === "warn") icon = "⚠️";
    if (type === "error") icon = "🚨";
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // 모달 열기
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("open");
      document.body.style.overflow = "hidden";
    }
  }

  // 모달 닫기
  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("open");
      document.body.style.overflow = "";
    }
  }

  // 탭 전환
  function switchTab(tabId) {
    activeTab = tabId;
    document.querySelectorAll(".app-tabs button").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tabId);
    });
    document.querySelectorAll(".tab-pane").forEach(pane => {
      pane.classList.toggle("active", pane.id === `pane-${tabId}`);
    });

    // 탭별 새로고침 트리거
    if (tabId === "dashboard" && window.renderDashboard) window.renderDashboard();
    if (tabId === "clients" && window.renderClientsList) window.renderClientsList();
    if (tabId === "tests" && window.renderTestsView) window.renderTestsView();
    if (tabId === "monitoring" && window.renderMonitoringView) window.renderMonitoringView();
    if (tabId === "stats" && window.renderStatsView) window.renderStatsView();
  }

  // 위험도 뱃지 HTML 생성
  function renderRiskBadge(riskLevel) {
    const info = window.APP_CONFIG.riskLevels[riskLevel] || window.APP_CONFIG.riskLevels.NORMAL;
    return `<span class="badge ${info.badgeClass}">● ${info.label}</span>`;
  }

  // 검사 판정 뱃지 HTML
  function renderVerdictBadge(verdict) {
    if (verdict === "HIGH_RISK") {
      return `<span class="badge badge-severe">🚨 고위험(위기)</span>`;
    } else if (verdict === "ATTENTION") {
      return `<span class="badge badge-moderate">⚠️ 주의/우선관리</span>`;
    }
    return `<span class="badge badge-normal">✅ 정상</span>`;
  }

  // 경남 시·군 셀렉트 옵션 생성
  function getRegionSelectOptions(selectedId = "") {
    let html = `<option value="all">전체 관할지역 (경남 18개 시·군)</option>`;
    window.APP_CONFIG.regions.forEach(r => {
      const isSel = r.id === selectedId ? "selected" : "";
      html += `<option value="${r.id}" ${isSel}>${r.name} (${r.centerId === 'jinju' ? '진주센터' : '창원센터'})</option>`;
    });
    return html;
  }

  // 현재 사용자 역할 설정
  function setRole(roleId) {
    const role = window.APP_CONFIG.demoRoles.find(r => r.id === roleId);
    if (role) {
      currentRole = role;
      const roleLabel = document.getElementById("currentRoleText");
      if (roleLabel) roleLabel.textContent = role.name;
      showToast(`${role.label}로 전환되었습니다.`, "info");
      
      // 역할에 따른 화면 갱신
      if (window.renderDashboard) window.renderDashboard();
    }
  }

  // DB 상태 뱃지 갱신
  function updateDbStatusBadge() {
    const badge = document.getElementById("dbStatusBadge");
    if (!badge) return;
    if (window.DB.isSupabase()) {
      badge.className = "db-status-badge supabase";
      badge.innerHTML = "⚡ Supabase 클라우드 연결됨";
    } else {
      badge.className = "db-status-badge demo";
      badge.innerHTML = "📦 로컬 데모 모드 (오프라인 시연 가능)";
    }
  }

  return {
    showToast,
    openModal,
    closeModal,
    switchTab,
    renderRiskBadge,
    renderVerdictBadge,
    getRegionSelectOptions,
    setRole,
    getCurrentRole: () => currentRole,
    getActiveTab: () => activeTab,
    updateDbStatusBadge
  };
})();
