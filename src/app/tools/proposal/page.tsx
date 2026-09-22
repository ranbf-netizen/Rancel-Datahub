import AiTool from "../AiTool";
export default function Page() {
  return <AiTool title="Proposal Generator" description="Professional business proposals in seconds." endpoint="/api/proposal" buttonLabel="Generate Proposal"
    fields={[
      { name: "service", label: "Service you're proposing", placeholder: "e.g. website design" },
      { name: "client", label: "Client name (optional)", placeholder: "e.g. ABC Ltd" },
      { name: "details", label: "Any extra details (optional)", type: "textarea", rows: 3 },
    ]} />;
}
