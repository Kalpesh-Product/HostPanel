import { useState } from "react";

interface TreeNodeData {
  id: string | number;
  name: string;
  children?: TreeNodeData[];
}

const TreeNode = ({ node }: { node: TreeNodeData }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="ml-4">
      <div
        className="flex items-center cursor-pointer text-lg font-semibold hover:text-blue-500"
        onClick={() => setExpanded(!expanded)}
      >
        {node.children && node.children.length > 0 && (
          <span className="mr-2">{expanded ? "-" : "+"}</span>
        )}
        {node.name}
      </div>

      {expanded && node.children && (
        <div className="mt-2">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
};

const Tree = ({ data }: { data: TreeNodeData[] }) => {
  return (
    <div className="tree">
      {data.map((node) => (
        <TreeNode key={node.id} node={node} />
      ))}
    </div>
  );
};

export default Tree;