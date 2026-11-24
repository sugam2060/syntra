/** A workspace as returned by the API. */
export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

/** A workspace together with the caller's own role in it. */
export interface MyWorkspace extends WorkspaceSummary {
  role: {
    /** Stable key such as `owner`, `admin`, `member`, `viewer`, or a custom role key. */
    key: string;
    name: string;
  };
}
