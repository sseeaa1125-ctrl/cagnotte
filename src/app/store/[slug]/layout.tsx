import { StoreDevTools } from "@/components/store/StoreDevTools";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <StoreDevTools />
    </>
  );
}
