import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <div className="relative">
      <AuthForm mode="login" />
      <div className="mx-auto -mt-8 max-w-sm px-6 pb-10">
        <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 px-4 py-3 text-xs text-neutral-600">
          <p className="mb-1 font-semibold text-neutral-700">Demo accounts</p>
          <p>
            <span className="font-mono">alice@test.ajaia.dev</span> /{" "}
            <span className="font-mono">password123</span>
          </p>
          <p>
            <span className="font-mono">bob@test.ajaia.dev</span> /{" "}
            <span className="font-mono">password123</span>
          </p>
          <p className="mt-1 text-neutral-400">
            Alice owns a document already shared with Bob.
          </p>
        </div>
      </div>
    </div>
  );
}
