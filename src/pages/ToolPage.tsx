import { TOOL_NAMES, ToolId } from '../data/modules';
import { CircuitTool, FlightTool, GearTool, InclineTool, LeverTool, LogicTool, NumberTool } from './tools/OtherTools';
import { BeamTool, CentroidTool, ForcesTool, SectionTool, TensileTool, TrussTool } from './tools/StructuresTools';

export function ToolView({ id }: { id: ToolId }) {
  const body = (() => {
    switch (id) {
      case 'beam':
        return <BeamTool />;
      case 'truss':
        return <TrussTool />;
      case 'circuit':
        return <CircuitTool />;
      case 'logic':
        return <LogicTool />;
      case 'numbase':
        return <NumberTool />;
      case 'section':
        return <SectionTool />;
      case 'centroid':
        return <CentroidTool />;
      case 'forces':
        return <ForcesTool />;
      case 'incline':
        return <InclineTool />;
      case 'gear':
        return <GearTool />;
      case 'flight':
        return <FlightTool />;
      case 'lever':
        return <LeverTool />;
      case 'tensile':
        return <TensileTool />;
      default:
        return <div className="empty">Unknown tool.</div>;
    }
  })();
  return (
    <div className="stack">
      <div className="row">
        <h2 style={{ margin: 0, fontSize: 16 }}>{TOOL_NAMES[id]}</h2>
        <span className="tag cyan">multi-step tool</span>
      </div>
      {body}
    </div>
  );
}

export function ToolPage({ id }: { id: ToolId }) {
  return <ToolView key={id} id={id} />;
}
