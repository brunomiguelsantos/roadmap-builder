import { monthIndex } from './dates.js';

export const COLUMNS_PER_MONTH = 10;
export const MONTHS_IN_YEAR = 12;
export const MAX_COLUMNS = COLUMNS_PER_MONTH * MONTHS_IN_YEAR;
export const POSITION_LIMIT = 109;

const TEXT_BOX_WIDTHS = Object.freeze([16, 16, 26, 38, 50, 62, 74, 85]);
const EXTRA_ITEM_WIDTH = 12;

export function monthToGridStart(month) {
    const index = monthIndex(month);
    return index < 0 ? 1 : index * COLUMNS_PER_MONTH + 1;
}

export function gridToMonthIndex(column) {
    if (!Number.isFinite(column) || column < 1 || column > MAX_COLUMNS) return -1;
    return Math.floor((column - 1) / COLUMNS_PER_MONTH);
}

export function textBoxWidth(totalItems) {
    if (!Number.isInteger(totalItems) || totalItems < 1) return TEXT_BOX_WIDTHS[1];
    if (totalItems < TEXT_BOX_WIDTHS.length) return TEXT_BOX_WIDTHS[totalItems];
    return TEXT_BOX_WIDTHS.at(-1) + (totalItems - 7) * EXTRA_ITEM_WIDTH;
}

export function zoomLevel(width, startGrid = null, endGrid = null) {
    const touchesEdge =
        (startGrid !== null && startGrid <= 10) || (endGrid !== null && endGrid >= 111);
    if (touchesEdge && width > 30) return 'small';
    if (width < 40) return 'large';
    if (width < 75) return 'medium';
    return 'small';
}

export function shouldPlaceBadgeBelow(storyWidth, badgeWidth, totalItems) {
    return storyWidth + badgeWidth > POSITION_LIMIT || totalItems >= 3;
}

export { monthIndex as monthToIndex };

// Where a date falls across the year's twelve equal-width month columns, as a
// fraction from 0 (start of January) to 1 (end of December). Each month is
// split by its own number of days and the date sits in the middle of its day,
// so the 15th of a 30-day month lands just before the month's midpoint.
// Returns null when the date is invalid or belongs to a different year.
export function yearFraction(date, year) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    if (date.getFullYear() !== year) return null;
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return (month + (date.getDate() - 0.5) / daysInMonth) / MONTHS_IN_YEAR;
}
