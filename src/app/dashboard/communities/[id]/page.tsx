"use client";

import { use } from "react";
import { CommunityMembers } from "@/components/dashboard/CommunityMembers";

export default function CommunityMembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <CommunityMembers communityId={id} />;
}
