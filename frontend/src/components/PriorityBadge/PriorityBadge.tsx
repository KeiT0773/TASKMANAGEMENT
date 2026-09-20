import { PRIORITY_LABEL } from '../../constants/priority';
import type { Priority } from '../../types/board';
import styles from './PriorityBadge.module.css';

interface Props {
  priority: Priority;
}

/** 優先度を表示名（高 / 中 / 低）と色で示すバッジ（FR-08） */
export function PriorityBadge({ priority }: Props) {
  return <span className={`${styles.badge} ${styles[priority]}`}>{PRIORITY_LABEL[priority]}</span>;
}
