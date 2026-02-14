import jsep, { Expression as JsepExpression } from 'jsep';
import type { ExprNode } from './bases-expr';

// configure jsep if needed
jsep.addBinaryOp('==', 6);
jsep.addBinaryOp('!=', 6);
jsep.addBinaryOp('>=', 7);
jsep.addBinaryOp('<=', 7);
// etc – but most are already there by default

export function parseExpression(expr: string): ExprNode {
  const ast = jsep(expr);
  return convertJsep(ast);
}

function convertJsep(node: JsepExpression): ExprNode {
  switch (node.type) {
    case 'Literal':
      return { type: 'Literal', value: (node as any).value };

    case 'Identifier':
      return { type: 'Identifier', name: (node as any).name };

    case 'UnaryExpression': {
      const n = node as any;
      return {
        type: 'UnaryExpression',
        operator: n.operator,
        argument: convertJsep(n.argument),
      };
    }

    case 'BinaryExpression': {
      const n = node as any;
      return {
        type: 'BinaryExpression',
        // jsep uses "===" etc; you can normalise to your subset if you like
        operator: n.operator,
        left: convertJsep(n.left),
        right: convertJsep(n.right),
      };
    }

    case 'LogicalExpression': {
      const n = node as any;
      return {
        type: 'LogicalExpression',
        operator: n.operator,
        left: convertJsep(n.left),
        right: convertJsep(n.right),
      };
    }

    case 'MemberExpression': {
      const n = node as any;
      return {
        type: 'MemberExpression',
        object: convertJsep(n.object),
        property: (n.property as any).name,
      };
    }

    case 'CallExpression': {
      const n = node as any;
      return {
        type: 'CallExpression',
        callee: convertJsep(n.callee),
        args: n.arguments.map(convertJsep),
      };
    }

    default:
      throw new Error(`Unsupported node type from jsep: ${node.type}`);
  }
}
