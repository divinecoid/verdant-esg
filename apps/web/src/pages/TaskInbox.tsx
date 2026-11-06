import RequestTable from '../components/RequestTable';

/** Everything waiting for a reviewer; opening a row shows the review panel. */
export default function TaskInbox() {
  return (
    <div className="space-y-4">
      <h1 className="display text-[36px] text-neutral-900">Pending Review List</h1>
      <RequestTable statuses="SUBMITTED" showReviewLevel actionLabel={() => 'Review'} />
    </div>
  );
}
