export type ExprNode =
  | LiteralNode
  | IdentifierNode
  | MemberExpressionNode
  | CallExpressionNode
  | UnaryExpressionNode
  | BinaryExpressionNode
  | LogicalExpressionNode;

export interface LiteralNode {
  type: 'Literal';
  value: unknown;
}

export interface IdentifierNode {
  type: 'Identifier';
  name: string;
}

export interface MemberExpressionNode {
  type: 'MemberExpression';
  object: ExprNode; // file, note, formula, etc.
  property: string; // ext, name, price, ...
}

export interface CallExpressionNode {
  type: 'CallExpression';
  callee: ExprNode; // file.inFolder, price.toFixed, today, ...
  args: ExprNode[];
}

export interface UnaryExpressionNode {
  type: 'UnaryExpression';
  operator: '!' | '-';
  argument: ExprNode;
}

export interface BinaryExpressionNode {
  type: 'BinaryExpression';
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | '+' | '-' | '*' | '/' | '%';
  left: ExprNode;
  right: ExprNode;
}

export interface LogicalExpressionNode {
  type: 'LogicalExpression';
  operator: '&&' | '||';
  left: ExprNode;
  right: ExprNode;
}
