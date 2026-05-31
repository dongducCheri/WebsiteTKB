function setupBlockInteractions(gridContainer, domBlocks) {
  const groupEls  = new Map();
  const groupActive = new Map();

  gridContainer.querySelectorAll('.course-block').forEach((el, index) => {
    const block = domBlocks[index];
    if (!block) return;
    el._blockIdx = index;

    if (block._gId) {
      if (!groupEls.has(block._gId)) groupEls.set(block._gId, []);
      groupEls.get(block._gId).push({ el, block });
    }
  });

  groupEls.forEach((members, gId) => {
    members.sort((a, b) => a.block.kip - b.block.kip);
    groupActive.set(gId, members.length - 1);
  });

  const applyGroupZIndex = (gId) => {
    const members = groupEls.get(gId);
    const active  = groupActive.get(gId);
    members.forEach(({ el, block }, i) => {
      el.style.zIndex = (i === active) ? 20 : block.kip;
    });
  };

  groupEls.forEach((_, gId) => applyGroupZIndex(gId));

  gridContainer.querySelectorAll('.course-block').forEach((el, index) => {
    const block = domBlocks[index];
    if (!block) return;

    el.querySelector('.cb-nav-up')?.addEventListener('click', e => {
      e.stopPropagation();
      const gId = block._gId;
      const members = groupEls.get(gId);
      let curr = groupActive.get(gId);
      curr = (curr - 1 + members.length) % members.length;
      groupActive.set(gId, curr);
      applyGroupZIndex(gId);
    });

    el.querySelector('.cb-nav-dn')?.addEventListener('click', e => {
      e.stopPropagation();
      const gId = block._gId;
      const members = groupEls.get(gId);
      let curr = groupActive.get(gId);
      curr = (curr + 1) % members.length;
      groupActive.set(gId, curr);
      applyGroupZIndex(gId);
    });

    el.querySelector('.cb-close-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      removeSelectedClass(block.maHP, block.loaiLop || block.loaiLopKey || '');
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
      if (e.target.closest('.cb-close-btn, .cb-kem-btn, .cb-copy-btn, .cb-nav, .cb-nav-btn')) return;
      e.stopPropagation();

      if (block.isPending) {
        if (block.subClasses.length === 1) {
          setSelectedClass(block.maHP, block.subClasses[0].loaiLop || block.loaiLop, block.subClasses[0].maLop);
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
