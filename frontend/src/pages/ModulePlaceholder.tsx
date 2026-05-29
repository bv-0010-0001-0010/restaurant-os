// Generic "coming next" page used by every module we haven't built yet.
// As each milestone lands, its route swaps this out for the real page.
export function ModulePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="page-title">{title}</h1>
      <p className="page-sub">{description}</p>
      <div className="placeholder">
        <div style={{ fontSize: 32, marginBottom: 12 }}>◷</div>
        This module is part of an upcoming milestone.
        <br />
        The foundation (auth, roles, navigation) is ready for it to plug into.
      </div>
    </div>
  );
}
