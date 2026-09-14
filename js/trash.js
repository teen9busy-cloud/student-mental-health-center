// ==============================================================================
// 경상남도교육청 학생정신건강 전담센터 - 데이터 휴지통 및 복구/영구삭제 모듈 (trash.js)
// ==============================================================================

(function() {
  let currentTrashTab = "clients"; // 'clients' or 'tests'

  // 휴지통 모달 열기
  async function openTrashBin() {
    window.UI.openModal("modalTrashBin");
    await renderTrashBin();
  }

  // 휴지통 탭 전환
  function switchTrashTab(tab) {
    currentTrashTab = tab;
    const btnClients = document.getElementById("btnTabTrashClients");
    const btnTests = document.getElementById("btnTabTrashTests");
    const containerClients = document.getElementById("trashClientsContainer");
    const containerTests = document.getElementById("trashTestsContainer");

    if (tab === "clients") {
      if (btnClients) {
        btnClients.className = "btn btn-sm btn-primary";
      }
      if (btnTests) {
        btnTests.className = "btn btn-sm btn-outline";
      }
      if (containerClients) containerClients.style.display = "block";
      if (containerTests) containerTests.style.display = "none";
    } else {
      if (btnClients) {
        btnClients.className = "btn btn-sm btn-outline";
      }
      if (btnTests) {
        btnTests.className = "btn btn-sm btn-primary";
      }
      if (containerClients) containerClients.style.display = "none";
      if (containerTests) containerTests.style.display = "block";
    }
  }

  // 상단 헤더 휴지통 뱃지 갱신
  async function updateTrashBadge() {
    try {
      const { clients, tests } = await window.DB.getTrashItems();
      const total = clients.length + tests.length;
      const badge = document.getElementById("headerTrashBadge");
      if (badge) {
        if (total > 0) {
          badge.textContent = total;
          badge.style.display = "inline-block";
        } else {
          badge.style.display = "none";
        }
      }
      const clientCountEl = document.getElementById("trashClientCount");
      if (clientCountEl) clientCountEl.textContent = clients.length;
      const testCountEl = document.getElementById("trashTestCount");
      if (testCountEl) testCountEl.textContent = tests.length;
    } catch (err) {
      console.warn("Failed to update trash badge:", err);
    }
  }

  // 휴지통 목록 렌더링
  async function renderTrashBin() {
    const clientsTbody = document.getElementById("trashClientsTbody");
    const testsTbody = document.getElementById("trashTestsTbody");

    if (clientsTbody) {
      clientsTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-sub)">데이터를 조회하는 중입니다...</td></tr>`;
    }
    if (testsTbody) {
      testsTbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-sub)">데이터를 조회하는 중입니다...</td></tr>`;
    }

    const { clients, tests } = await window.DB.getTrashItems();
    await updateTrashBadge();

    // 1. 학생 렌더링
    if (clientsTbody) {
      if (clients.length === 0) {
        clientsTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--text-sub)">휴지통에 보관된 학생이 없습니다.</td></tr>`;
      } else {
        clientsTbody.innerHTML = clients.map(s => {
          const daysLeftBadge = s.days_left <= 2
            ? `<span class="badge" style="background:#fef2f2;color:#ef4444;border:1px solid #fca5a5;font-weight:700">D-${s.days_left} (만료임박)</span>`
            : `<span class="badge" style="background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0">D-${s.days_left} 남음</span>`;

          const deletedDateStr = s.deleted_at ? s.deleted_at.substring(0, 16).replace("T", " ") : "-";

          return `
            <tr>
              <td><strong style="color:var(--text-main)">${s.client_code}</strong></td>
              <td><strong>${s.name}</strong> (${s.gender})</td>
              <td>${s.school_name} (${s.grade}학년)</td>
              <td style="font-size:12.5px;color:var(--text-sub)">${deletedDateStr}</td>
              <td>${daysLeftBadge}</td>
              <td style="text-align:center">
                <div style="display:inline-flex;gap:6px">
                  <button type="button" class="btn btn-outline btn-sm" style="color:#0284c7;border-color:#bae6fd" onclick="window.restoreTrashClient('${s.id}')">
                    🔄 복구
                  </button>
                  <button type="button" class="btn btn-outline btn-sm" style="color:#ef4444;border-color:#fca5a5" onclick="window.permanentDeleteTrashClient('${s.id}')">
                    💥 영구삭제
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join("");
      }
    }

    // 2. 검사 렌더링
    if (testsTbody) {
      if (tests.length === 0) {
        testsTbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:28px;color:var(--text-sub)">휴지통에 보관된 심리검사가 없습니다.</td></tr>`;
      } else {
        testsTbody.innerHTML = tests.map(t => {
          const testDef = window.APP_CONFIG.testTypes[t.test_type];
          const testName = testDef ? testDef.name : t.test_type;
          const daysLeftBadge = t.days_left <= 2
            ? `<span class="badge" style="background:#fef2f2;color:#ef4444;border:1px solid #fca5a5;font-weight:700">D-${t.days_left} (만료임박)</span>`
            : `<span class="badge" style="background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0">D-${t.days_left} 남음</span>`;
          const deletedDateStr = t.deleted_at ? t.deleted_at.substring(0, 16).replace("T", " ") : "-";

          return `
            <tr>
              <td><strong>${t.client_name || "이름미기재"}</strong> <span style="font-size:12px;color:var(--text-sub)">(${t.client_code || ""})</span></td>
              <td><strong style="color:var(--secondary)">${testName}</strong></td>
              <td>${t.total_score}점 ${t.t_score ? `(T:${t.t_score})` : ""}</td>
              <td>${window.UI.renderVerdictBadge(t.verdict)}</td>
              <td style="font-size:12.5px;color:var(--text-sub)">${deletedDateStr}</td>
              <td>${daysLeftBadge}</td>
              <td style="text-align:center">
                <div style="display:inline-flex;gap:6px">
                  <button type="button" class="btn btn-outline btn-sm" style="color:#0284c7;border-color:#bae6fd" onclick="window.restoreTrashTest('${t.id}')">
                    🔄 복구
                  </button>
                  <button type="button" class="btn btn-outline btn-sm" style="color:#ef4444;border-color:#fca5a5" onclick="window.permanentDeleteTrashTest('${t.id}')">
                    💥 영구삭제
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join("");
      }
    }
  }

  // 1) 학생 복구
  async function restoreTrashClient(id) {
    if (!confirm("해당 학생 정보를 복구하시겠습니까?\n\n복구 시 학생 관리 목록 및 대시보드에 즉시 재반영됩니다.")) return;
    const ok = await window.DB.restoreClient(id);
    if (ok) {
      window.UI.showToast("학생 정보가 성공적으로 복구되었습니다.", "success");
      await renderTrashBin();
      refreshAllViews();
    } else {
      window.UI.showToast("학생 복구 중 오류가 발생했습니다.", "error");
    }
  }

  // 2) 학생 영구 삭제
  async function permanentDeleteTrashClient(id) {
    if (!confirm("⚠️ 주의: 영구 삭제 시 학생 프로필 및 연결된 모든 상담/검사 이력이 데이터베이스에서 완전히 삭제되며 절대 복구할 수 없습니다.\n\n정말 영구 삭제하시겠습니까?")) return;
    const ok = await window.DB.permanentDeleteClient(id);
    if (ok) {
      window.UI.showToast("학생 정보가 영구 삭제되었습니다.", "info");
      await renderTrashBin();
      refreshAllViews();
    } else {
      window.UI.showToast("영구 삭제 중 오류가 발생했습니다.", "error");
    }
  }

  // 3) 심리검사 복구
  async function restoreTrashTest(id) {
    if (!confirm("해당 심리검사 기록을 복구하시겠습니까?\n\n복구 시 심리검사 목록 및 학생 상세 이력에 즉시 재반영됩니다.")) return;
    const ok = await window.DB.restoreTest(id);
    if (ok) {
      window.UI.showToast("심리검사 기록이 성공적으로 복구되었습니다.", "success");
      await renderTrashBin();
      refreshAllViews();
    } else {
      window.UI.showToast("검사 복구 중 오류가 발생했습니다.", "error");
    }
  }

  // 4) 심리검사 영구 삭제
  async function permanentDeleteTrashTest(id) {
    if (!confirm("⚠️ 주의: 해당 심리검사 기록이 영구적으로 파기됩니다. 복구할 수 없습니다.\n\n정말 영구 삭제하시겠습니까?")) return;
    const ok = await window.DB.permanentDeleteTest(id);
    if (ok) {
      window.UI.showToast("심리검사 기록이 영구 삭제되었습니다.", "info");
      await renderTrashBin();
      refreshAllViews();
    } else {
      window.UI.showToast("영구 삭제 중 오류가 발생했습니다.", "error");
    }
  }

  // 5) 휴지통 전체 비우기
  async function emptyTrashAll() {
    if (!confirm("💥 경고: 휴지통에 보관된 모든 학생 및 검사 기록을 영구 파기합니다.\n\n이 작업은 절대 되돌릴 수 없습니다. 휴지통을 비우시겠습니까?")) return;
    const ok = await window.DB.emptyTrash();
    if (ok) {
      window.UI.showToast("휴지통의 모든 항목이 영구 파기되었습니다.", "info");
      await renderTrashBin();
      refreshAllViews();
    } else {
      window.UI.showToast("휴지통 비우기 중 오류가 발생했습니다.", "error");
    }
  }

  // 6) 현재 열려있는 학생 상세 모달에서 학생 삭제
  async function deleteCurrentStudent() {
    const studentId = window.getSelectedStudentId ? window.getSelectedStudentId() : null;
    if (!studentId) {
      window.UI.showToast("선택된 학생이 없습니다.", "warn");
      return;
    }
    await deleteStudentById(studentId);
  }

  // 7) 학생 삭제 (휴지통으로 이동)
  async function deleteStudentById(id, name) {
    let studentName = name;
    if (!studentName) {
      const s = await window.DB.getClientById(id);
      if (s) studentName = s.name;
    }

    const msg = `'${studentName || "해당 학생"}' 학생의 프로필을 휴지통으로 이동하시겠습니까?\n\n• 7일 동안 휴지통에 안전하게 보관되며 원클릭으로 복구할 수 있습니다.\n• 7일 후에는 자동으로 영구 파기됩니다.`;
    if (!confirm(msg)) return;

    const ok = await window.DB.deleteClient(id);
    if (ok) {
      window.UI.showToast(`'${studentName || "학생"}'이(가) 휴지통으로 이동되었습니다. (7일간 복구 가능)`, "info");
      window.UI.closeModal("modalStudentDetail");
      await updateTrashBadge();
      refreshAllViews();
    } else {
      window.UI.showToast("삭제 처리 중 오류가 발생했습니다.", "error");
    }
  }

  // 8) 심리검사 삭제 (휴지통으로 이동)
  async function deleteTestRecord(id, name) {
    const msg = `'${name || "심리검사"}' 기록을 휴지통으로 이동하시겠습니까?\n\n• 7일 동안 휴지통에서 언제든 복구할 수 있습니다.\n• 7일 후에는 영구 파기됩니다.`;
    if (!confirm(msg)) return;

    const ok = await window.DB.deleteTest(id);
    if (ok) {
      window.UI.showToast("심리검사 기록이 휴지통으로 이동되었습니다.", "info");
      
      // 만약 학생 상세 모달이 열려있는 중이었다면 상세 내역 갱신
      if (window.getSelectedStudentId && window.getSelectedStudentId()) {
        const currentSid = window.getSelectedStudentId();
        if (window.viewStudentDetail) window.viewStudentDetail(currentSid);
      }

      await updateTrashBadge();
      refreshAllViews();
    } else {
      window.UI.showToast("검사 삭제 중 오류가 발생했습니다.", "error");
    }
  }

  // 전체 뷰 새로고침 도우미
  function refreshAllViews() {
    if (window.renderClientsList) window.renderClientsList();
    if (window.renderTestsView) window.renderTestsView();
    if (window.renderMonitoringView) window.renderMonitoringView();
    if (window.renderDashboard) window.renderDashboard();
    if (window.populateStudentSelects) window.populateStudentSelects();
  }

  // 전역 노출
  window.openTrashBin = openTrashBin;
  window.switchTrashTab = switchTrashTab;
  window.updateTrashBadge = updateTrashBadge;
  window.renderTrashBin = renderTrashBin;
  window.restoreTrashClient = restoreTrashClient;
  window.permanentDeleteTrashClient = permanentDeleteTrashClient;
  window.restoreTrashTest = restoreTrashTest;
  window.permanentDeleteTrashTest = permanentDeleteTrashTest;
  window.emptyTrashAll = emptyTrashAll;
  window.deleteCurrentStudent = deleteCurrentStudent;
  window.deleteStudentById = deleteStudentById;
  window.deleteTestRecord = deleteTestRecord;
})();
