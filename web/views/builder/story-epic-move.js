// "Move to Epic" handling for the Builder's story rows.
//
// A story's epic membership is just "which epic's stories-container it's a
// DOM child of", and regular EPICs / Below the Line use different field sets
// (status flags and country flags vs. Date Added), so moving a story across
// that boundary means: read it out via the shape-appropriate collector,
// remove it from its current home, create a fresh shell in the target, then
// repopulate that shell via the shape-appropriate loader. The collectors and
// loaders are the exact functions builder.js already uses to import/export a
// whole roadmap, so the field mapping is proven elsewhere.
//
// KTLO is out of scope - it's a single freeform block, not a list of
// stories, so there's nothing to move it to/from.
//
// The dropdown is a plain <select>, but web/components/select.js enhances
// every <select> on the page into a custom trigger-button + listbox pair
// (see that file for why - a native popup can't be themed) and hides the
// real <select> from focus/click entirely. So options can't be refreshed via
// the select's own focus/click - the delegated `focusin` listener below
// targets the *wrapper*, which the enhancement documents as always receiving
// focus first (via its trigger button) whether the control is opened by
// mouse or keyboard, and always before it reads `select.options` to build
// the visible menu.

/**
 * @param {object} deps
 * @param {(epicId: string|number) => void} deps.addStory
 * @param {() => void} deps.addBTLStory
 * @param {(storyId: string) => void} deps.removeStory
 * @param {(storyId: string, story: object) => void} deps.loadStoryData
 * @param {(storyId: string, story: object) => void} deps.applyBTLStoryData
 * @param {(storyId: string) => object} deps.collectStoryData
 * @param {(storyId: string) => object} deps.collectBTLStoryData
 * @param {() => void} deps.updateBTLAddButton
 * @param {() => void} deps.generatePreview
 * @returns {{ moveStoryToEpic: (selectEl: HTMLSelectElement, storyId: string) => void }}
 */
export function createStoryEpicMove({
    addStory,
    addBTLStory,
    removeStory,
    loadStoryData,
    applyBTLStoryData,
    collectStoryData,
    collectBTLStoryData,
    updateBTLAddButton,
    generatePreview,
}) {
    const BTL_OPTION_VALUE = '__btl__';

    function isBTLStoryId(storyId) {
        return storyId.startsWith('btl-');
    }

    // Rebuilt every time the control gains focus (see the focusin listener
    // below) so renamed, added, or removed EPICs are always reflected
    // without extra bookkeeping. That includes the focus the enhanced widget
    // restores to its trigger right after a selection is committed (see
    // select.js's close({ refocus: true })), which fires *before* it
    // dispatches the resulting `change` event - so the just-picked value is
    // preserved across the rebuild rather than reset, or that refocus would
    // silently erase the pick before moveStoryToEpic ever sees it.
    function populateMoveEpicOptions(selectEl, storyId) {
        const isBTL = isBTLStoryId(storyId);
        const currentEpicId = isBTL ? null : storyId.split('-')[0];
        const previousValue = selectEl.value;

        selectEl.innerHTML = '';

        // Kept short (rather than e.g. "Move to EPIC…") because it's also the
        // trigger's own label whenever nothing more specific is selected -
        // which is always, since picking a real option immediately re-homes
        // and removes the story. The title/aria-label on the <select> carry
        // the full description for a tooltip/screen reader.
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '⇄';
        selectEl.appendChild(placeholder);

        document.querySelectorAll('.epic-section').forEach((epicEl) => {
            const epicId = epicEl.id.split('-')[1];
            if (!isBTL && epicId === currentEpicId) return;

            const nameEl = document.getElementById(`epic-name-${epicId}`);
            const name = nameEl && nameEl.value.trim() ? nameEl.value.trim() : `EPIC ${epicId}`;

            const option = document.createElement('option');
            option.value = epicId;
            option.textContent = name;
            selectEl.appendChild(option);
        });

        if (!isBTL) {
            const btlOption = document.createElement('option');
            btlOption.value = BTL_OPTION_VALUE;
            btlOption.textContent = 'Below the Line';
            selectEl.appendChild(btlOption);
        }

        const stillValid = Array.from(selectEl.options).some((o) => o.value === previousValue);
        selectEl.value = stillValid ? previousValue : '';
    }

    function moveStoryToEpic(selectEl, storyId) {
        const target = selectEl.value;
        selectEl.value = '';
        if (!target) return;

        const isBTLSource = isBTLStoryId(storyId);
        const data = isBTLSource ? collectBTLStoryData(storyId) : collectStoryData(storyId);

        if (isBTLSource) {
            document.getElementById(`story-${storyId}`)?.remove();
            updateBTLAddButton();
        } else {
            removeStory(storyId);
        }

        if (target === BTL_OPTION_VALUE) {
            addBTLStory();
            const newStoryEl = document.querySelector(
                '#btl-stories-container .story-section:last-child'
            );
            if (newStoryEl) {
                applyBTLStoryData(newStoryEl.id.replace('story-', ''), data);
            }
            updateBTLAddButton();
        } else {
            addStory(target);
            const container = document.getElementById(`stories-container-${target}`);
            const newStoryEl = container && container.querySelector('.story-section:last-child');
            if (newStoryEl) {
                loadStoryData(newStoryEl.id.replace('story-', ''), data);
            }
        }

        setTimeout(generatePreview, 100);
    }

    // Delegated so it survives story-section re-renders without rewiring,
    // and so it works whether the target select has been wrapped by the
    // select-enhancement component yet or not (both shapes carry the
    // .story-move-select class - see web/components/select.js).
    document.addEventListener('focusin', (event) => {
        const host = event.target.closest?.('.story-move-select');
        if (!host) return;
        const selectEl = host.matches('select') ? host : host.querySelector('select');
        const storyId = selectEl?.dataset.storyId;
        if (!storyId) return;
        populateMoveEpicOptions(selectEl, storyId);
    });

    return { moveStoryToEpic };
}
