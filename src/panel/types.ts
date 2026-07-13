export interface TreeNode {
  id: number;
  type: string;
  tag?: string;
  val?: string;
  name?: string;
  pseudoType?: string;
  attrs?: Record<string, string>;
  children?: TreeNode[];
}

export interface ClassToken {
  original: string;
  mapped: string;
  isMapped: boolean;
  path?: string;
}

export interface ClassMapResult {
  displayStr: string;
  tokens: ClassToken[];
}
