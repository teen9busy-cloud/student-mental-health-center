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

  // 키보드 ESC 키 입력 시 현재 열려 있는 팝업 모달 닫기
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const openModals = document.querySelectorAll(".modal-backdrop.open");
      if (openModals.length > 0) {
        const lastModal = openModals[openModals.length - 1];
        closeModal(lastModal.id);
      }
    }
  });

  // 팝업 바깥 어두운 배경(Backdrop) 클릭 시 모달 닫기
  document.addEventListener("click", (e) => {
    if (e.target && e.target.classList && e.target.classList.contains("modal-backdrop") && e.target.classList.contains("open")) {
      closeModal(e.target.id);
    }
  });

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

  const ROLE_CONFIGS = {
    dr_kim: {
      title: "🩺 김진우 센터장 (소아청소년정신과 전문의)",
      badge: "의사 / 센터장 총괄 결재",
      desc: "고위험 위기 학생의 정신과적 임상 소견 결재, 약물치료 및 병원 외래진료 연계를 최종 승인하고 전담센터 전체 운영을 총괄합니다.",
      autoTab: "dashboard",
      isEdu: false
    },
    psych_park: {
      title: "🧠 박서연 임상심리사 (1급 정신건강임상심리사)",
      badge: "심리검사 / 수치화 전담",
      desc: "정서행동 2차 심층검사(AMPQ-II), 우울(K-BDI-II), 불안, CBCL 척도 수치화 및 엑셀 일괄 업로드·임상 평가서 작성을 전담합니다.",
      autoTab: "tests",
      isEdu: false
    },
    social_lee: {
      title: "🤝 이민호 사회복지사 (1급 정신건강사회복지사)",
      badge: "사례관리 / 모니터링 전담",
      desc: "Wee클래스·교육청 의뢰 학생 신규 접수 등록, 학교 및 가정 방문 모니터링 상담 일지 작성, 학생 안전망 연계를 전담합니다.",
      autoTab: "clients",
      isEdu: false
    }
  };

  // 현재 역할 배너 업데이트
  function updateRoleBanner() {
    const banner = document.getElementById("roleGuideBanner");
    if (!banner) return;
    const cfg = ROLE_CONFIGS[currentRole.id] || ROLE_CONFIGS.dr_kim;
    banner.className = `role-banner role-${currentRole.id}`;
    banner.innerHTML = `
      <div>
        <div class="role-banner-title">
          <span>${cfg.title}</span>
          <span class="role-banner-badge">${cfg.badge}</span>
        </div>
        <div class="role-banner-desc">${cfg.desc}</div>
      </div>
      <div style="font-size:13px;opacity:0.85;white-space:nowrap;margin-left:14px;background:rgba(255,255,255,0.4);padding:4px 8px;border-radius:6px">
        시연 중 ⚡
      </div>
    `;

    // 교육청 모드일 때 학생 등록 버튼 제어 (열람 전용)
    const btnNewStu = document.querySelector("#pane-clients .panel-header .btn-primary");
    if (btnNewStu) {
      if (cfg.isEdu) {
        btnNewStu.style.display = "none";
      } else {
        btnNewStu.style.display = "inline-flex";
      }
    }
  }

  // 현재 사용자 역할 설정
  function setRole(roleId) {
    const role = window.APP_CONFIG.demoRoles.find(r => r.id === roleId);
    if (role) {
      currentRole = role;
      const cfg = ROLE_CONFIGS[roleId] || ROLE_CONFIGS.dr_kim;
      updateRoleBanner();
      showToast(`${cfg.title} 모드로 전환되었습니다.`, "info");
      
      // 해당 역할에 최적화된 탭으로 자동 이동
      if (cfg.autoTab) {
        switchTab(cfg.autoTab);
      }

      // 학생 상세 모달이 열려있다면 역할 변경에 맞춰 동적 갱신
      const modal = document.getElementById("modalStudentDetail");
      if (modal && modal.classList.contains("active") && window.getSelectedStudentId) {
        const selId = window.getSelectedStudentId();
        if (selId && window.viewStudentDetail) {
          window.viewStudentDetail(selId);
        }
      }
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
    updateDbStatusBadge,
    updateRoleBanner
  };
})();
