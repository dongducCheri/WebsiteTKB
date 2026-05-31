function setupBlockInteractions(gridContainer, domBlocks) {
  const groupEls = new Map();

  gridContainer.querySelectorAll('.course-block').forEach((el, index) => {
    const block = domBlocks[index];
    if (!block) return;
    el._blockIdx = index;

    if (block._gId) {
      if (!groupEls.has(block._gId)) groupEls.set(block._gId, []);
      groupEls.get(block._gId).push({ el, block });
    }
  });

  groupEls.forEach((members) => {
    members.sort((a, b) => (a.block._stackRank ?? 0) - (b.block._stackRank ?? 0));
    members.forEach(({ el, block }) => {
      el.style.zIndex = block._stackZ ?? 10;
    });
  });

  gridContainer.querySelectorAll('.course-block').forEach((el, index) => {
    const block = domBlocks[index];
    if (!block) return;

    const loaiKey = block.loaiLopKey || block.loaiLop || '';
    const maLop = block.primaryMaLop || block.subClasses[0]?.maLop;

    el.querySelector('.cb-shift-left')?.addEventListener('click', e => {
      e.stopPropagation();
      const next = getBlockShift(block) - 1;
      setBlockShift(block.maHP, loaiKey, next, maLop);
      applyBlockShiftToEl(el, block);
    });

    el.querySelector('.cb-shift-right')?.addEventListener('click', e => {
      e.stopPropagation();
      const next = getBlockShift(block) + 1;
      setBlockShift(block.maHP, loaiKey, next, maLop);
      applyBlockShiftToEl(el, block);
    });

    el.querySelector('.cb-shift-center')?.addEventListener('dblclick', e => {
      e.stopPropagation();
      e.preventDefault();
      setBlockShift(block.maHP, loaiKey, 0, maLop);
      applyBlockShiftToEl(el, block);
    });

    el.querySelector('.cb-close-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      const code = block.primaryMaLop || block.subClasses[0]?.maLop;
      removeSelectedClass(block.maHP, block.loaiLop || block.loaiLopKey || '', code);
      onClassRemovedFromTimetable(block.maHP);
      refreshSelectionUI();
    });

    el.querySelectorAll('.cb-kem-btn:not(:disabled)').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        addCompanionClass(btn.dataset.mahp, btn.dataset.malopKem);
      });
    });

    el.querySelectorAll('.cb-copy-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const code = btn.dataset.copyMalop;
        const ok = await copyMaLopToClipboard(code);
        if (ok) {
          showToast(`Đã copy mã lớp ${code}`);
          btn.classList.add('cb-copied');
          clearTimeout(btn._copiedTimer);
          btn._copiedTimer = setTimeout(() => btn.classList.remove('cb-copied'), 2500);
        } else {
          showToast('Không copy được mã lớp', 'error');
        }
      });
    });

    const scrollCard = el.querySelector('.cb-card');
    if (scrollCard && el.classList.contains('cb-confirmed')) {
      el.addEventListener('wheel', e => {
        if (scrollCard.scrollHeight <= scrollCard.clientHeight) return;
        const atTop = scrollCard.scrollTop <= 0;
        const atBottom = scrollCard.scrollTop + scrollCard.clientHeight >= scrollCard.scrollHeight - 1;
        if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) return;
        e.preventDefault();
        e.stopPropagation();
        scrollCard.scrollTop += e.deltaY;
      }, { passive: false });
    }

    el.addEventListener('click', e => {
      if (e.target.closest('.cb-close-btn, .cb-kem-btn, .cb-copy-btn, .cb-shift-bar, .cb-shift-btn')) return;
      e.stopPropagation();

      if (block.isPending) {
        if (block.subClasses.length === 1) {
          const sc = block.subClasses[0];
          setSelectedClass(block.maHP, sc.loaiLop || block.loaiLop, sc.maLop);
          onClassPicked(block.maHP);
          refreshSelectionUI();
        } else {
          showConflictModal(block);
        }
        return;
      }

      showBlockDetailModal(block);
    });
  });
}

function setupTimetableDrop(gridContainer) {
  const ttWrap = gridContainer.querySelector('.tt-wrap');
  if (!ttWrap) return;

  ttWrap.addEventListener('dragover', e => {
    e.preventDefault();
    ttWrap.classList.add('tt-drag-over');
  });

  ttWrap.addEventListener('dragleave', e => {
    if (!ttWrap.contains(e.relatedTarget)) ttWrap.classList.remove('tt-drag-over');
  });

  ttWrap.addEventListener('drop', e => {
    e.preventDefault();
    ttWrap.classList.remove('tt-drag-over');
    const maHP = e.dataTransfer.getData('text/plain');
    if (maHP && state.courseMap[maHP]) {
      startEditingCourse(maHP);
      refreshSelectionUI();
    }
  });
}
