export type PyPrimitive = string | number | boolean | null;

export interface PyInstanceRef {
  kind: 'instance';
  id: string;
}

export interface PyListVal {
  kind: 'list';
  items: PyRuntimeVal[];
}

export interface PyDictVal {
  kind: 'dict';
  entries: Record<string, PyRuntimeVal>;
}

export interface PyClassRef {
  kind: 'class';
  name: string;
}

export type PyRuntimeVal = PyPrimitive | PyInstanceRef | PyListVal | PyDictVal | PyClassRef;

export interface MethodParam {
  name: string;
  defaultExpr?: string;
}

export interface PyMethodDef {
  name: string;
  params: MethodParam[];
  body: AstStmt[];
  line: number;
  isProperty?: boolean;
}

export interface PyClassDef {
  name: string;
  parentName: string | null;
  classAttributes: Record<string, PyRuntimeVal>;
  methods: Record<string, PyMethodDef>;
  line: number;
}

export interface PyHeapInstance {
  id: string;
  className: string;
  attributes: Record<string, PyRuntimeVal>;
  createdAtStep: number;
}

export interface HeapInstanceView {
  id: string;
  className: string;
  attributes: Array<{ key: string; value: string; rawType: string; changed?: boolean }>;
  createdAtStep: number;
}

export interface ClassBlueprintView {
  name: string;
  parentName: string | null;
  classAttributes: Array<{ key: string; value: string }>;
  methods: Array<{
    name: string;
    signature: string;
    isProperty: boolean;
    line: number;
  }>;
  line: number;
}

export interface VariableBindingView {
  name: string;
  displayValue: string;
  refInstanceId: string | null;
  valueType: 'instance' | 'class' | 'primitive' | 'collection';
}

export interface ExecutionStep {
  stepIndex: number;
  line: number;
  code: string;
  explanation: string;
  activeSelfId: string | null;
  activeMethodLabel: string | null;
  variables: VariableBindingView[];
  classes: ClassBlueprintView[];
  instances: HeapInstanceView[];
  output: string[];
}

export interface PythonRunResult {
  success: boolean;
  error: { line: number; type: string; message: string } | null;
  steps: ExecutionStep[];
  output: string[];
  classes: ClassBlueprintView[];
  instances: HeapInstanceView[];
  variables: VariableBindingView[];
}

type AstStmt =
  | { type: 'class'; name: string; parentName: string | null; classVars: Array<{ name: string; expr: string; line: number }>; methods: PyMethodDef[]; line: number }
  | { type: 'def'; name: string; params: MethodParam[]; body: AstStmt[]; line: number; isProperty?: boolean }
  | { type: 'assign'; target: string; op: '=' | '+=' | '-=' | '*=' | '/='; expr: string; line: number }
  | { type: 'return'; expr: string | null; line: number }
  | { type: 'if'; branches: Array<{ cond: string | null; body: AstStmt[]; line: number }>; line: number }
  | { type: 'for'; varName: string; iterExpr: string; body: AstStmt[]; line: number }
  | { type: 'while'; cond: string; body: AstStmt[]; line: number }
  | { type: 'expr'; expr: string; line: number }
  | { type: 'pass'; line: number };

class PyError extends Error {
  errorType: string;
  line: number;
  constructor(errorType: string, message: string, line: number) {
    super(message);
    this.errorType = errorType;
    this.line = line;
  }
}

class ReturnSignal {
  value: PyRuntimeVal;
  constructor(value: PyRuntimeVal) {
    this.value = value;
  }
}

interface RawLine {
  lineNumber: number;
  indent: number;
  text: string;
}

function stripInlineComment(line: string): string {
  let inSingle = false;
  let inDouble = false;
  let escaped = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === '#' && !inSingle && !inDouble) {
      return line.slice(0, i).trimEnd();
    }
  }
  return line.trimEnd();
}

function preprocessLines(source: string): RawLine[] {
  const lines = source.split(/\r?\n/);
  const result: RawLine[] = [];
  for (let i = 0; i < lines.length; i++) {
    const expanded = lines[i].replace(/\t/g, '    ');
    const cleaned = stripInlineComment(expanded);
    if (!cleaned.trim()) continue;
    const match = cleaned.match(/^( *)/);
    const indent = match ? match[1].length : 0;
    result.push({
      lineNumber: i + 1,
      indent,
      text: cleaned.trim(),
    });
  }
  return result;
}

function splitTopLevelArgs(raw: string): string[] {
  const args: string[] = [];
  let current = '';
  let depthParen = 0;
  let depthBracket = 0;
  let depthBrace = 0;
  let inSingle = false;
  let inDouble = false;
  let escaped = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      current += ch;
      escaped = true;
      continue;
    }
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      current += ch;
      continue;
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      current += ch;
      continue;
    }
    if (!inSingle && !inDouble) {
      if (ch === '(') depthParen++;
      else if (ch === ')') depthParen--;
      else if (ch === '[') depthBracket++;
      else if (ch === ']') depthBracket--;
      else if (ch === '{') depthBrace++;
      else if (ch === '}') depthBrace--;
      else if (ch === ',' && depthParen === 0 && depthBracket === 0 && depthBrace === 0) {
        if (current.trim()) args.push(current.trim());
        current = '';
        continue;
      }
    }
    current += ch;
  }
  if (current.trim()) args.push(current.trim());
  return args;
}

function parseParamList(rawParams: string): MethodParam[] {
  if (!rawParams.trim()) return [];
  return splitTopLevelArgs(rawParams).map((part) => {
    const eqIdx = findTopLevelChar(part, '=');
    if (eqIdx === -1) {
      return { name: part.trim() };
    }
    return {
      name: part.slice(0, eqIdx).trim(),
      defaultExpr: part.slice(eqIdx + 1).trim(),
    };
  });
}

function findTopLevelChar(expr: string, target: string): number {
  let depthParen = 0;
  let depthBracket = 0;
  let depthBrace = 0;
  let inSingle = false;
  let inDouble = false;
  let escaped = false;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (!inSingle && !inDouble) {
      if (ch === '(') depthParen++;
      else if (ch === ')') depthParen--;
      else if (ch === '[') depthBracket++;
      else if (ch === ']') depthBracket--;
      else if (ch === '{') depthBrace++;
      else if (ch === '}') depthBrace--;
      else if (ch === target && depthParen === 0 && depthBracket === 0 && depthBrace === 0) {
        return i;
      }
    }
  }
  return -1;
}

function findTopLevelAssignment(text: string): { target: string; op: '=' | '+=' | '-=' | '*=' | '/='; expr: string } | null {
  const ops: Array<'+=' | '-=' | '*=' | '/=' | '='> = ['+=', '-=', '*=', '/=', '='];
  let depthParen = 0;
  let depthBracket = 0;
  let depthBrace = 0;
  let inSingle = false;
  let inDouble = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (!inSingle && !inDouble) {
      if (ch === '(') depthParen++;
      else if (ch === ')') depthParen--;
      else if (ch === '[') depthBracket++;
      else if (ch === ']') depthBracket--;
      else if (ch === '{') depthBrace++;
      else if (ch === '}') depthBrace--;
      else if (depthParen === 0 && depthBracket === 0 && depthBrace === 0) {
        for (const op of ops) {
          if (text.startsWith(op, i)) {
            if (op === '=') {
              const prev = text[i - 1];
              const next = text[i + 1];
              if (prev === '=' || prev === '!' || prev === '<' || prev === '>' || next === '=') {
                continue;
              }
            }
            const target = text.slice(0, i).trim();
            const expr = text.slice(i + op.length).trim();
            if (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(target)) {
              return { target, op, expr };
            }
          }
        }
      }
    }
  }
  return null;
}

function parseBlock(lines: RawLine[], startIndex: number, minIndent: number): { stmts: AstStmt[]; nextIndex: number } {
  const stmts: AstStmt[] = [];
  let i = startIndex;

  while (i < lines.length) {
    const cur = lines[i];
    if (cur.indent < minIndent) break;

    if (cur.text === 'pass') {
      stmts.push({ type: 'pass', line: cur.lineNumber });
      i++;
      continue;
    }

    if (cur.text.startsWith('@')) {
      const decorator = cur.text.slice(1).trim();
      i++;
      if (i >= lines.length || !lines[i].text.startsWith('def ')) {
        throw new PyError('SyntaxError', `裝飾器 @${decorator} 後方必須緊接 def 方法定義`, cur.lineNumber);
      }
      const defLine = lines[i];
      const defMatch = defLine.text.match(/^def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\((.*)\)\s*:$/);
      if (!defMatch) {
        throw new PyError('SyntaxError', `無效的方法定義語法: ${defLine.text}`, defLine.lineNumber);
      }
      const bodyStart = i + 1;
      if (bodyStart >= lines.length || lines[bodyStart].indent <= defLine.indent) {
        throw new PyError('IndentationError', `方法 ${defMatch[1]} 缺少縮排主體`, defLine.lineNumber);
      }
      const parsedBody = parseBlock(lines, bodyStart, lines[bodyStart].indent);
      stmts.push({
        type: 'def',
        name: defMatch[1],
        params: parseParamList(defMatch[2]),
        body: parsedBody.stmts,
        line: defLine.lineNumber,
        isProperty: decorator === 'property',
      });
      i = parsedBody.nextIndex;
      continue;
    }

    if (cur.text.startsWith('class ')) {
      const classMatch = cur.text.match(/^class\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\))?\s*:$/);
      if (!classMatch) {
        throw new PyError('SyntaxError', `無效的類別定義語法: ${cur.text}`, cur.lineNumber);
      }
      const bodyStart = i + 1;
      if (bodyStart >= lines.length || lines[bodyStart].indent <= cur.indent) {
        throw new PyError('IndentationError', `類別 ${classMatch[1]} 缺少縮排主體`, cur.lineNumber);
      }
      const parsedBody = parseBlock(lines, bodyStart, lines[bodyStart].indent);
      const classVars: Array<{ name: string; expr: string; line: number }> = [];
      const methods: PyMethodDef[] = [];
      for (const s of parsedBody.stmts) {
        if (s.type === 'assign') {
          classVars.push({ name: s.target, expr: s.expr, line: s.line });
        } else if (s.type === 'def') {
          methods.push({
            name: s.name,
            params: s.params,
            body: s.body,
            line: s.line,
            isProperty: s.isProperty,
          });
        } else if (s.type === 'pass') {
          // valid no-op
        } else {
          throw new PyError('SyntaxError', `類別主體內目前支援屬性定義與 def 方法`, s.line);
        }
      }
      stmts.push({
        type: 'class',
        name: classMatch[1],
        parentName: classMatch[2] || null,
        classVars,
        methods,
        line: cur.lineNumber,
      });
      i = parsedBody.nextIndex;
      continue;
    }

    if (cur.text.startsWith('def ')) {
      const defMatch = cur.text.match(/^def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\((.*)\)\s*:$/);
      if (!defMatch) {
        throw new PyError('SyntaxError', `無效的函式/方法語法: ${cur.text}`, cur.lineNumber);
      }
      const bodyStart = i + 1;
      if (bodyStart >= lines.length || lines[bodyStart].indent <= cur.indent) {
        throw new PyError('IndentationError', `函式 ${defMatch[1]} 缺少縮排主體`, cur.lineNumber);
      }
      const parsedBody = parseBlock(lines, bodyStart, lines[bodyStart].indent);
      stmts.push({
        type: 'def',
        name: defMatch[1],
        params: parseParamList(defMatch[2]),
        body: parsedBody.stmts,
        line: cur.lineNumber,
      });
      i = parsedBody.nextIndex;
      continue;
    }

    if (cur.text.startsWith('if ')) {
      const ifMatch = cur.text.match(/^if\s+(.+):$/);
      if (!ifMatch) {
        throw new PyError('SyntaxError', `無效的 if 條件語法: ${cur.text}`, cur.lineNumber);
      }
      const branches: Array<{ cond: string | null; body: AstStmt[]; line: number }> = [];
      let bodyStart = i + 1;
      if (bodyStart >= lines.length || lines[bodyStart].indent <= cur.indent) {
        throw new PyError('IndentationError', `if 區塊缺少縮排程式碼`, cur.lineNumber);
      }
      let parsedBody = parseBlock(lines, bodyStart, lines[bodyStart].indent);
      branches.push({ cond: ifMatch[1].trim(), body: parsedBody.stmts, line: cur.lineNumber });
      i = parsedBody.nextIndex;

      while (i < lines.length && lines[i].indent === cur.indent) {
        const nextLine = lines[i];
        if (nextLine.text.startsWith('elif ')) {
          const elifMatch = nextLine.text.match(/^elif\s+(.+):$/);
          if (!elifMatch) throw new PyError('SyntaxError', `無效的 elif 語法: ${nextLine.text}`, nextLine.lineNumber);
          bodyStart = i + 1;
          if (bodyStart >= lines.length || lines[bodyStart].indent <= nextLine.indent) {
            throw new PyError('IndentationError', `elif 區塊缺少縮排程式碼`, nextLine.lineNumber);
          }
          parsedBody = parseBlock(lines, bodyStart, lines[bodyStart].indent);
          branches.push({ cond: elifMatch[1].trim(), body: parsedBody.stmts, line: nextLine.lineNumber });
          i = parsedBody.nextIndex;
        } else if (nextLine.text === 'else:') {
          bodyStart = i + 1;
          if (bodyStart >= lines.length || lines[bodyStart].indent <= nextLine.indent) {
            throw new PyError('IndentationError', `else 區塊缺少縮排程式碼`, nextLine.lineNumber);
          }
          parsedBody = parseBlock(lines, bodyStart, lines[bodyStart].indent);
          branches.push({ cond: null, body: parsedBody.stmts, line: nextLine.lineNumber });
          i = parsedBody.nextIndex;
          break;
        } else {
          break;
        }
      }
      stmts.push({ type: 'if', branches, line: cur.lineNumber });
      continue;
    }

    if (cur.text.startsWith('for ')) {
      const forMatch = cur.text.match(/^for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+(.+):$/);
      if (!forMatch) {
        throw new PyError('SyntaxError', `無效的 for 迴圈語法: ${cur.text}`, cur.lineNumber);
      }
      const bodyStart = i + 1;
      if (bodyStart >= lines.length || lines[bodyStart].indent <= cur.indent) {
        throw new PyError('IndentationError', `for 迴圈缺少縮排主體`, cur.lineNumber);
      }
      const parsedBody = parseBlock(lines, bodyStart, lines[bodyStart].indent);
      stmts.push({
        type: 'for',
        varName: forMatch[1],
        iterExpr: forMatch[2].trim(),
        body: parsedBody.stmts,
        line: cur.lineNumber,
      });
      i = parsedBody.nextIndex;
      continue;
    }

    if (cur.text.startsWith('while ')) {
      const whileMatch = cur.text.match(/^while\s+(.+):$/);
      if (!whileMatch) {
        throw new PyError('SyntaxError', `無效的 while 迴圈語法: ${cur.text}`, cur.lineNumber);
      }
      const bodyStart = i + 1;
      if (bodyStart >= lines.length || lines[bodyStart].indent <= cur.indent) {
        throw new PyError('IndentationError', `while 迴圈缺少縮排主體`, cur.lineNumber);
      }
      const parsedBody = parseBlock(lines, bodyStart, lines[bodyStart].indent);
      stmts.push({
        type: 'while',
        cond: whileMatch[1].trim(),
        body: parsedBody.stmts,
        line: cur.lineNumber,
      });
      i = parsedBody.nextIndex;
      continue;
    }

    if (cur.text === 'return' || cur.text.startsWith('return ')) {
      const expr = cur.text === 'return' ? null : cur.text.slice(7).trim();
      stmts.push({ type: 'return', expr, line: cur.lineNumber });
      i++;
      continue;
    }

    const assign = findTopLevelAssignment(cur.text);
    if (assign) {
      stmts.push({
        type: 'assign',
        target: assign.target,
        op: assign.op,
        expr: assign.expr,
        line: cur.lineNumber,
      });
      i++;
      continue;
    }

    stmts.push({ type: 'expr', expr: cur.text, line: cur.lineNumber });
    i++;
  }

  return { stmts, nextIndex: i };
}

function isTruthy(val: PyRuntimeVal): boolean {
  if (val === null || val === false || val === 0 || val === '') return false;
  if (typeof val === 'object' && val.kind === 'list') return val.items.length > 0;
  if (typeof val === 'object' && val.kind === 'dict') return Object.keys(val.entries).length > 0;
  return true;
}

function formatPyValue(val: PyRuntimeVal, instances?: Map<string, PyHeapInstance>, quoteStr = false): string {
  if (val === null) return 'None';
  if (val === true) return 'True';
  if (val === false) return 'False';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'string') return quoteStr ? `"${val}"` : val;
  if (val.kind === 'instance') {
    const inst = instances?.get(val.id);
    return inst ? `<${inst.className} 實體 @ ${val.id}>` : `<object @ ${val.id}>`;
  }
  if (val.kind === 'class') {
    return `<class '${val.name}'>`;
  }
  if (val.kind === 'list') {
    return `[${val.items.map((x) => formatPyValue(x, instances, true)).join(', ')}]`;
  }
  if (val.kind === 'dict') {
    const parts = Object.entries(val.entries).map(([k, v]) => `'${k}': ${formatPyValue(v, instances, true)}`);
    return `{${parts.join(', ')}}`;
  }
  return String(val);
}

function isValidNumber(v: PyRuntimeVal): v is number {
  return typeof v === 'number' && !Number.isNaN(v);
}

export function runPythonOop(source: string): PythonRunResult {
  const classes = new Map<string, PyClassDef>();
  const instances = new Map<string, PyHeapInstance>();
  const globalScope = new Map<string, PyRuntimeVal>();
  const functions = new Map<string, { params: MethodParam[]; body: AstStmt[]; line: number }>();
  const output: string[] = [];
  const steps: ExecutionStep[] = [];
  let nextAddr = 0x1040;
  let stepCounter = 0;

  const allocId = () => {
    const hex = `0x${nextAddr.toString(16).toUpperCase()}`;
    nextAddr += 0x10;
    return hex;
  };

  let prevAttrSnapshot = new Map<string, Record<string, string>>();

  const snapshotClasses = (): ClassBlueprintView[] => {
    return Array.from(classes.values()).map((c) => ({
      name: c.name,
      parentName: c.parentName,
      classAttributes: Object.entries(c.classAttributes).map(([k, v]) => ({
        key: k,
        value: formatPyValue(v, instances, true),
      })),
      methods: Object.values(c.methods).map((m) => ({
        name: m.name,
        signature: `${m.isProperty ? '@property ' : ''}def ${m.name}(${m.params.map((p) => (p.defaultExpr ? `${p.name}=${p.defaultExpr}` : p.name)).join(', ')})`,
        isProperty: Boolean(m.isProperty),
        line: m.line,
      })),
      line: c.line,
    }));
  };

  const snapshotInstances = (): HeapInstanceView[] => {
    const nextSnap = new Map<string, Record<string, string>>();
    const views = Array.from(instances.values()).map((inst) => {
      const prevAttrs = prevAttrSnapshot.get(inst.id) || {};
      const curRecord: Record<string, string> = {};
      const attributes = Object.entries(inst.attributes).map(([k, v]) => {
        const formatted = formatPyValue(v, instances, true);
        curRecord[k] = formatted;
        const rawType =
          v === null
            ? 'NoneType'
            : typeof v === 'object'
              ? v.kind
              : typeof v;
        return {
          key: k,
          value: formatted,
          rawType,
          changed: prevAttrs[k] !== formatted,
        };
      });
      nextSnap.set(inst.id, curRecord);
      return {
        id: inst.id,
        className: inst.className,
        attributes,
        createdAtStep: inst.createdAtStep,
      };
    });
    prevAttrSnapshot = nextSnap;
    return views;
  };

  const snapshotVariables = (): VariableBindingView[] => {
    return Array.from(globalScope.entries()).map(([name, val]) => {
      if (val && typeof val === 'object' && val.kind === 'instance') {
        const inst = instances.get(val.id);
        return {
          name,
          displayValue: `${inst?.className ?? 'Object'} @ ${val.id}`,
          refInstanceId: val.id,
          valueType: 'instance',
        };
      }
      if (val && typeof val === 'object' && val.kind === 'class') {
        return {
          name,
          displayValue: `<class '${val.name}'>`,
          refInstanceId: null,
          valueType: 'class',
        };
      }
      if (val && typeof val === 'object') {
        return {
          name,
          displayValue: formatPyValue(val, instances, true),
          refInstanceId: null,
          valueType: 'collection',
        };
      }
      return {
        name,
        displayValue: formatPyValue(val, instances, true),
        refInstanceId: null,
        valueType: 'primitive',
      };
    });
  };

  const recordStep = (
    line: number,
    code: string,
    explanation: string,
    activeSelfId: string | null = null,
    activeMethodLabel: string | null = null
  ) => {
    if (steps.length >= 200) return;
    steps.push({
      stepIndex: stepCounter++,
      line,
      code,
      explanation,
      activeSelfId,
      activeMethodLabel,
      variables: snapshotVariables(),
      classes: snapshotClasses(),
      instances: snapshotInstances(),
      output: [...output],
    });
  };

  const lookupMethod = (className: string, methodName: string): { owner: PyClassDef; method: PyMethodDef } | null => {
    let curName: string | null = className;
    const visited = new Set<string>();
    while (curName && !visited.has(curName)) {
      visited.add(curName);
      const cls = classes.get(curName);
      if (!cls) break;
      if (cls.methods[methodName]) {
        return { owner: cls, method: cls.methods[methodName] };
      }
      curName = cls.parentName;
    }
    return null;
  };

  const lookupClassAttr = (className: string, attrName: string): PyRuntimeVal | undefined => {
    let curName: string | null = className;
    const visited = new Set<string>();
    while (curName && !visited.has(curName)) {
      visited.add(curName);
      const cls = classes.get(curName);
      if (!cls) break;
      if (attrName in cls.classAttributes) {
        return cls.classAttributes[attrName];
      }
      curName = cls.parentName;
    }
    return undefined;
  };

  const isSubclassOf = (childName: string, targetClass: string): boolean => {
    let cur: string | null = childName;
    const visited = new Set<string>();
    while (cur && !visited.has(cur)) {
      if (cur === targetClass) return true;
      visited.add(cur);
      cur = classes.get(cur)?.parentName || null;
    }
    return false;
  };

  const resolveScopeVar = (name: string, scopes: Array<Map<string, PyRuntimeVal>>): PyRuntimeVal => {
    for (let s = scopes.length - 1; s >= 0; s--) {
      if (scopes[s].has(name)) {
        return scopes[s].get(name)!;
      }
    }
    if (classes.has(name)) {
      return { kind: 'class', name };
    }
    throw new PyError('NameError', `找不到變數或類別名稱 '${name}'`, 0);
  };

  const invokeMethod = (
    inst: PyHeapInstance,
    ownerClass: PyClassDef,
    method: PyMethodDef,
    argVals: PyRuntimeVal[],
    callLine: number,
    scopes: Array<Map<string, PyRuntimeVal>>,
    superStartClass?: string
  ): PyRuntimeVal => {
    const localScope = new Map<string, PyRuntimeVal>();
    localScope.set('self', { kind: 'instance', id: inst.id });
    if (superStartClass) {
      localScope.set('__super_owner__', superStartClass);
    } else {
      localScope.set('__super_owner__', ownerClass.name);
    }

    const paramsWithoutSelf = method.params[0]?.name === 'self' ? method.params.slice(1) : method.params;
    for (let idx = 0; idx < paramsWithoutSelf.length; idx++) {
      const param = paramsWithoutSelf[idx];
      if (idx < argVals.length) {
        localScope.set(param.name, argVals[idx]);
      } else if (param.defaultExpr !== undefined) {
        localScope.set(param.name, evalExpr(param.defaultExpr, scopes, callLine));
      } else {
        throw new PyError(
          'TypeError',
          `${ownerClass.name}.${method.name}() 缺少必要參數 '${param.name}'`,
          callLine
        );
      }
    }
    if (argVals.length > paramsWithoutSelf.length) {
      throw new PyError(
        'TypeError',
        `${ownerClass.name}.${method.name}() 傳入了過多參數 (預期 ${paramsWithoutSelf.length} 個，收到 ${argVals.length} 個)`,
        callLine
      );
    }

    const nextScopes = [...scopes, localScope];
    try {
      execBlock(method.body, nextScopes, inst.id, `${ownerClass.name}.${method.name}()`);
    } catch (sig) {
      if (sig instanceof ReturnSignal) {
        return sig.value;
      }
      throw sig;
    }
    return null;
  };

  const evalFString = (template: string, scopes: Array<Map<string, PyRuntimeVal>>, line: number): string => {
    let out = '';
    let i = 0;
    while (i < template.length) {
      if (template[i] === '{') {
        if (template[i + 1] === '{') {
          out += '{';
          i += 2;
          continue;
        }
        let depth = 1;
        let j = i + 1;
        while (j < template.length && depth > 0) {
          if (template[j] === '{') depth++;
          else if (template[j] === '}') depth--;
          j++;
        }
        if (depth !== 0) throw new PyError('SyntaxError', 'f-string 大括號未閉合', line);
        const innerExpr = template.slice(i + 1, j - 1).trim();
        const val = evalExpr(innerExpr, scopes, line);
        out += formatPyValue(val, instances, false);
        i = j;
      } else if (template[i] === '}' && template[i + 1] === '}') {
        out += '}';
        i += 2;
      } else {
        out += template[i];
        i++;
      }
    }
    return out;
  };

  const evalExpr = (rawExpr: string, scopes: Array<Map<string, PyRuntimeVal>>, line: number): PyRuntimeVal => {
    const expr = rawExpr.trim();
    if (!expr) throw new PyError('SyntaxError', '空運算式', line);

    // Strip outer wrapping parentheses if balanced around entire expression
    if (expr.startsWith('(') && expr.endsWith(')')) {
      let depth = 0;
      let wrapsAll = true;
      let inS = false;
      let inD = false;
      for (let i = 0; i < expr.length; i++) {
        const ch = expr[i];
        if (ch === "'" && !inD) inS = !inS;
        else if (ch === '"' && !inS) inD = !inD;
        else if (!inS && !inD) {
          if (ch === '(') depth++;
          else if (ch === ')') depth--;
          if (depth === 0 && i < expr.length - 1) {
            wrapsAll = false;
            break;
          }
        }
      }
      if (wrapsAll) {
        return evalExpr(expr.slice(1, -1), scopes, line);
      }
    }

    // Boolean operators: or, and
    const splitByKeyword = (kw: 'or' | 'and'): [string, string] | null => {
      let dP = 0;
      let dB = 0;
      let dC = 0;
      let inS = false;
      let inD = false;
      for (let i = 0; i < expr.length; i++) {
        const ch = expr[i];
        if (ch === "'" && !inD) inS = !inS;
        else if (ch === '"' && !inS) inD = !inD;
        else if (!inS && !inD) {
          if (ch === '(') dP++;
          else if (ch === ')') dP--;
          else if (ch === '[') dB++;
          else if (ch === ']') dB--;
          else if (ch === '{') dC++;
          else if (ch === '}') dC--;
          else if (dP === 0 && dB === 0 && dC === 0) {
            const pattern = new RegExp(`^\\s+${kw}\\s+`);
            const m = expr.slice(i).match(pattern);
            if (m && i > 0) {
              return [expr.slice(0, i), expr.slice(i + m[0].length)];
            }
          }
        }
      }
      return null;
    };

    const orParts = splitByKeyword('or');
    if (orParts) {
      const left = evalExpr(orParts[0], scopes, line);
      return isTruthy(left) ? left : evalExpr(orParts[1], scopes, line);
    }

    const andParts = splitByKeyword('and');
    if (andParts) {
      const left = evalExpr(andParts[0], scopes, line);
      return !isTruthy(left) ? left : evalExpr(andParts[1], scopes, line);
    }

    if (expr.startsWith('not ')) {
      return !isTruthy(evalExpr(expr.slice(4), scopes, line));
    }

    // Comparisons
    const compOps = ['==', '!=', '<=', '>=', '<', '>'];
    for (const op of compOps) {
      let dP = 0, dB = 0, dC = 0, inS = false, inD = false;
      for (let i = 0; i < expr.length; i++) {
        const ch = expr[i];
        if (ch === "'" && !inD) inS = !inS;
        else if (ch === '"' && !inS) inD = !inD;
        else if (!inS && !inD) {
          if (ch === '(') dP++;
          else if (ch === ')') dP--;
          else if (ch === '[') dB++;
          else if (ch === ']') dB--;
          else if (ch === '{') dC++;
          else if (ch === '}') dC--;
          else if (dP === 0 && dB === 0 && dC === 0 && expr.startsWith(op, i)) {
            if ((op === '<' || op === '>') && expr[i + 1] === '=') continue;
            const left = evalExpr(expr.slice(0, i), scopes, line);
            const right = evalExpr(expr.slice(i + op.length), scopes, line);
            if (op === '==') return JSON.stringify(left) === JSON.stringify(right);
            if (op === '!=') return JSON.stringify(left) !== JSON.stringify(right);
            if (isValidNumber(left) && isValidNumber(right)) {
              if (op === '<') return left < right;
              if (op === '>') return left > right;
              if (op === '<=') return left <= right;
              if (op === '>=') return left >= right;
            }
            throw new PyError('TypeError', `無法使用 '${op}' 比較不同型別`, line);
          }
        }
      }
    }

    // Binary + and - (right-to-left scan for left associativity)
    const findLastTopLevelBinary = (ops: string[]): { idx: number; op: string } | null => {
      let dP = 0, dB = 0, dC = 0, inS = false, inD = false;
      for (let i = expr.length - 1; i >= 0; i--) {
        const ch = expr[i];
        if (ch === "'" && !inD) inS = !inS;
        else if (ch === '"' && !inS) inD = !inD;
        else if (!inS && !inD) {
          if (ch === ')') dP++;
          else if (ch === '(') dP--;
          else if (ch === ']') dB++;
          else if (ch === '[') dB--;
          else if (ch === '}') dC++;
          else if (ch === '{') dC--;
          else if (dP === 0 && dB === 0 && dC === 0) {
            for (const op of ops) {
              if (op.length === 2 && i > 0 && expr.slice(i - 1, i + 1) === op) {
                return { idx: i - 1, op };
              }
              if (op.length === 1 && ch === op && i > 0) {
                const prevNonSpace = expr.slice(0, i).trimEnd().slice(-1);
                if (prevNonSpace && !'+-*/%(=,[{:'.includes(prevNonSpace)) {
                  if (op === '/' && expr[i - 1] === '/') continue;
                  if (op === '*' && expr[i - 1] === '*') continue;
                  return { idx: i, op };
                }
              }
            }
          }
        }
      }
      return null;
    };

    const addSub = findLastTopLevelBinary(['+', '-']);
    if (addSub) {
      const left = evalExpr(expr.slice(0, addSub.idx), scopes, line);
      const right = evalExpr(expr.slice(addSub.idx + 1), scopes, line);
      if (addSub.op === '+') {
        if (typeof left === 'string' && typeof right === 'string') return left + right;
        if (isValidNumber(left) && isValidNumber(right)) return left + right;
        if (left && typeof left === 'object' && left.kind === 'list' && right && typeof right === 'object' && right.kind === 'list') {
          return { kind: 'list', items: [...left.items, ...right.items] };
        }
        throw new PyError('TypeError', `無法對不相容型別執行 '+' 運算`, line);
      } else {
        if (isValidNumber(left) && isValidNumber(right)) return left - right;
        throw new PyError('TypeError', `無法對非數值型別執行 '-' 運算`, line);
      }
    }

    const mulDiv = findLastTopLevelBinary(['//', '*', '/', '%']);
    if (mulDiv) {
      const left = evalExpr(expr.slice(0, mulDiv.idx), scopes, line);
      const right = evalExpr(expr.slice(mulDiv.idx + mulDiv.op.length), scopes, line);
      if (mulDiv.op === '*' && typeof left === 'string' && isValidNumber(right)) {
        return left.repeat(Math.max(0, Math.floor(right)));
      }
      if (!isValidNumber(left) || !isValidNumber(right)) {
        throw new PyError('TypeError', `算術運算 '${mulDiv.op}' 需要數字型別`, line);
      }
      if ((mulDiv.op === '/' || mulDiv.op === '//' || mulDiv.op === '%') && right === 0) {
        throw new PyError('ZeroDivisionError', '除數不可為零', line);
      }
      if (mulDiv.op === '*') return left * right;
      if (mulDiv.op === '/') return left / right;
      if (mulDiv.op === '//') return Math.floor(left / right);
      return left % right;
    }

    // Unary minus
    if (expr.startsWith('-')) {
      const val = evalExpr(expr.slice(1), scopes, line);
      if (!isValidNumber(val)) throw new PyError('TypeError', `一元負號 '-' 需要數值`, line);
      return -val;
    }

    // Literals
    if (expr === 'True') return true;
    if (expr === 'False') return false;
    if (expr === 'None') return null;
    if (/^\d+(?:\.\d+)?$/.test(expr)) return Number(expr);

    // f-string
    if ((expr.startsWith('f"') && expr.endsWith('"')) || (expr.startsWith("f'") && expr.endsWith("'"))) {
      return evalFString(expr.slice(2, -1), scopes, line);
    }

    // Regular string
    if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
      return expr.slice(1, -1).replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    }

    // List literal
    if (expr.startsWith('[') && expr.endsWith(']')) {
      const inner = expr.slice(1, -1).trim();
      if (!inner) return { kind: 'list', items: [] };
      const items = splitTopLevelArgs(inner).map((it) => evalExpr(it, scopes, line));
      return { kind: 'list', items };
    }

    // Dict literal
    if (expr.startsWith('{') && expr.endsWith('}')) {
      const inner = expr.slice(1, -1).trim();
      if (!inner) return { kind: 'dict', entries: {} };
      const entries: Record<string, PyRuntimeVal> = {};
      for (const pair of splitTopLevelArgs(inner)) {
        const colonIdx = findTopLevelChar(pair, ':');
        if (colonIdx === -1) throw new PyError('SyntaxError', `字典語法錯誤: ${pair}`, line);
        const keyVal = evalExpr(pair.slice(0, colonIdx), scopes, line);
        const val = evalExpr(pair.slice(colonIdx + 1), scopes, line);
        entries[String(keyVal)] = val;
      }
      return { kind: 'dict', entries };
    }

    // super().method(args)
    const superMatch = expr.match(/^super\(\)\.([A-Za-z_][A-Za-z0-9_]*)\((.*)\)$/);
    if (superMatch) {
      const selfRef = resolveScopeVar('self', scopes);
      const superOwnerName = resolveScopeVar('__super_owner__', scopes);
      if (!selfRef || typeof selfRef !== 'object' || selfRef.kind !== 'instance') {
        throw new PyError('RuntimeError', 'super() 只能在類別方法中使用', line);
      }
      const inst = instances.get(selfRef.id)!;
      const ownerCls = typeof superOwnerName === 'string' ? classes.get(superOwnerName) : undefined;
      if (!ownerCls || !ownerCls.parentName) {
        throw new PyError('AttributeError', `${ownerCls?.name || inst.className} 沒有父類別可供 super() 呼叫`, line);
      }
      const methodName = superMatch[1];
      const found = lookupMethod(ownerCls.parentName, methodName);
      if (!found) {
        throw new PyError('AttributeError', `父類別 '${ownerCls.parentName}' 沒有方法 '${methodName}'`, line);
      }
      const args = superMatch[2].trim()
        ? splitTopLevelArgs(superMatch[2]).map((a) => evalExpr(a, scopes, line))
        : [];
      return invokeMethod(inst, found.owner, found.method, args, line, scopes, found.owner.name);
    }

    // Function or Method call: target(args)
    if (expr.endsWith(')')) {
      // Find matching opening paren for the trailing ')'
      let depth = 0;
      let openIdx = -1;
      let inS = false, inD = false;
      for (let i = expr.length - 1; i >= 0; i--) {
        const ch = expr[i];
        if (ch === "'" && !inD) inS = !inS;
        else if (ch === '"' && !inS) inD = !inD;
        else if (!inS && !inD) {
          if (ch === ')') depth++;
          else if (ch === '(') {
            depth--;
            if (depth === 0) {
              openIdx = i;
              break;
            }
          }
        }
      }
      if (openIdx > 0) {
        const callee = expr.slice(0, openIdx).trim();
        const rawArgs = expr.slice(openIdx + 1, -1).trim();
        const args = rawArgs ? splitTopLevelArgs(rawArgs).map((a) => evalExpr(a, scopes, line)) : [];

        // Built-in functions
        if (callee === 'print') {
          const text = args.map((a) => formatPyValue(a, instances, false)).join(' ');
          output.push(text);
          return null;
        }
        if (callee === 'len') {
          if (args.length !== 1) throw new PyError('TypeError', 'len() 需要恰好 1 個參數', line);
          const v = args[0];
          if (typeof v === 'string') return v.length;
          if (v && typeof v === 'object' && v.kind === 'list') return v.items.length;
          if (v && typeof v === 'object' && v.kind === 'dict') return Object.keys(v.entries).length;
          throw new PyError('TypeError', '此型別不支援 len()', line);
        }
        if (callee === 'str') return formatPyValue(args[0] ?? '', instances, false);
        if (callee === 'int') return Math.trunc(Number(args[0] ?? 0));
        if (callee === 'float') return Number(args[0] ?? 0);
        if (callee === 'bool') return isTruthy(args[0] ?? false);
        if (callee === 'round') {
          const n = Number(args[0] ?? 0);
          const digits = Number(args[1] ?? 0);
          const factor = 10 ** digits;
          return Math.round(n * factor) / factor;
        }
        if (callee === 'sum') {
          const v = args[0];
          if (!v || typeof v !== 'object' || v.kind !== 'list') {
            throw new PyError('TypeError', 'sum() 需要串列 (list)', line);
          }
          return v.items.reduce<number>((acc, cur) => acc + (typeof cur === 'number' ? cur : 0), 0);
        }
        if (callee === 'range') {
          const start = args.length >= 2 ? Number(args[0]) : 0;
          const stop = args.length >= 2 ? Number(args[1]) : Number(args[0] ?? 0);
          const step = args.length >= 3 ? Number(args[2]) : 1;
          const items: PyRuntimeVal[] = [];
          for (let k = start; step > 0 ? k < stop : k > stop; k += step) {
            if (items.length > 500) break;
            items.push(k);
          }
          return { kind: 'list', items };
        }
        if (callee === 'type') {
          const v = args[0];
          if (v && typeof v === 'object' && v.kind === 'instance') {
            return `<class '${instances.get(v.id)?.className}'>`;
          }
          if (typeof v === 'number') return Number.isInteger(v) ? "<class 'int'>" : "<class 'float'>";
          if (typeof v === 'string') return "<class 'str'>";
          if (typeof v === 'boolean') return "<class 'bool'>";
          if (v === null) return "<class 'NoneType'>";
          return "<class 'object'>";
        }
        if (callee === 'id') {
          const v = args[0];
          if (v && typeof v === 'object' && v.kind === 'instance') return v.id;
          return '0x0000';
        }
        if (callee === 'isinstance') {
          if (args.length !== 2) throw new PyError('TypeError', 'isinstance() 需要 2 個參數', line);
          const [obj, clsRef] = args;
          if (obj && typeof obj === 'object' && obj.kind === 'instance' && clsRef && typeof clsRef === 'object' && clsRef.kind === 'class') {
            const inst = instances.get(obj.id);
            return inst ? isSubclassOf(inst.className, clsRef.name) : false;
          }
          return false;
        }

        // Top-level class instantiation
        if (classes.has(callee)) {
          const cls = classes.get(callee)!;
          const newId = allocId();
          const newInst: PyHeapInstance = {
            id: newId,
            className: cls.name,
            attributes: {},
            createdAtStep: stepCounter,
          };
          instances.set(newId, newInst);
          const initFound = lookupMethod(cls.name, '__init__');
          if (initFound) {
            invokeMethod(newInst, initFound.owner, initFound.method, args, line, scopes, initFound.owner.name);
          } else if (args.length > 0) {
            throw new PyError('TypeError', `${cls.name}() 未定義 __init__ 卻傳入了參數`, line);
          }
          return { kind: 'instance', id: newId };
        }

        // Top-level user function
        if (functions.has(callee)) {
          const fn = functions.get(callee)!;
          const fnScope = new Map<string, PyRuntimeVal>();
          fn.params.forEach((p, idx) => {
            if (idx < args.length) fnScope.set(p.name, args[idx]);
            else if (p.defaultExpr) fnScope.set(p.name, evalExpr(p.defaultExpr, scopes, line));
          });
          try {
            execBlock(fn.body, [...scopes, fnScope], null, `${callee}()`);
          } catch (sig) {
            if (sig instanceof ReturnSignal) return sig.value;
            throw sig;
          }
          return null;
        }

        // Method call on object: receiver.method(args)
        const lastDot = callee.lastIndexOf('.');
        if (lastDot > 0) {
          const receiverExpr = callee.slice(0, lastDot);
          const methodName = callee.slice(lastDot + 1);
          const receiverVal = evalExpr(receiverExpr, scopes, line);

          if (receiverVal && typeof receiverVal === 'object' && receiverVal.kind === 'instance') {
            const inst = instances.get(receiverVal.id)!;
            const found = lookupMethod(inst.className, methodName);
            if (!found) {
              throw new PyError('AttributeError', `'${inst.className}' 物件沒有方法 '${methodName}'`, line);
            }
            return invokeMethod(inst, found.owner, found.method, args, line, scopes, found.owner.name);
          }

          if (receiverVal && typeof receiverVal === 'object' && receiverVal.kind === 'list') {
            if (methodName === 'append') {
              receiverVal.items.push(args[0] ?? null);
              return null;
            }
            if (methodName === 'pop') {
              return receiverVal.items.pop() ?? null;
            }
          }

          if (typeof receiverVal === 'string') {
            if (methodName === 'upper') return receiverVal.toUpperCase();
            if (methodName === 'lower') return receiverVal.toLowerCase();
            if (methodName === 'strip') return receiverVal.trim();
          }

          throw new PyError('AttributeError', `找不到方法 '${methodName}'`, line);
        }

        throw new PyError('NameError', `未定義的函式或類別 '${callee}'`, line);
      }
    }

    // Indexing: target[idx]
    if (expr.endsWith(']')) {
      const openIdx = expr.lastIndexOf('[');
      if (openIdx > 0) {
        const container = evalExpr(expr.slice(0, openIdx), scopes, line);
        const keyVal = evalExpr(expr.slice(openIdx + 1, -1), scopes, line);
        if (container && typeof container === 'object' && container.kind === 'list' && typeof keyVal === 'number') {
          const idx = keyVal < 0 ? container.items.length + keyVal : keyVal;
          if (idx < 0 || idx >= container.items.length) {
            throw new PyError('IndexError', `串列索引 ${keyVal} 超出範圍`, line);
          }
          return container.items[idx];
        }
        if (container && typeof container === 'object' && container.kind === 'dict') {
          const k = String(keyVal);
          if (!(k in container.entries)) throw new PyError('KeyError', `字典中找不到鍵 '${k}'`, line);
          return container.entries[k];
        }
      }
    }

    // Attribute chain: a.b or self.x or ClassName.attr
    if (expr.includes('.')) {
      const parts = expr.split('.');
      let cur: PyRuntimeVal = resolveScopeVar(parts[0], scopes);
      for (let p = 1; p < parts.length; p++) {
        const attr = parts[p];
        if (cur && typeof cur === 'object' && cur.kind === 'instance') {
          const inst = instances.get(cur.id)!;
          if (attr in inst.attributes) {
            cur = inst.attributes[attr];
            continue;
          }
          // Check @property
          const propFound = lookupMethod(inst.className, attr);
          if (propFound && propFound.method.isProperty) {
            cur = invokeMethod(inst, propFound.owner, propFound.method, [], line, scopes, propFound.owner.name);
            continue;
          }
          const clsAttr = lookupClassAttr(inst.className, attr);
          if (clsAttr !== undefined) {
            cur = clsAttr;
            continue;
          }
          throw new PyError('AttributeError', `'${inst.className}' 實體沒有屬性 '${attr}'`, line);
        }
        if (cur && typeof cur === 'object' && cur.kind === 'class') {
          const clsAttr = lookupClassAttr(cur.name, attr);
          if (clsAttr !== undefined) {
            cur = clsAttr;
            continue;
          }
          throw new PyError('AttributeError', `類別 '${cur.name}' 沒有屬性 '${attr}'`, line);
        }
        throw new PyError('AttributeError', `無法讀取屬性 '${attr}'`, line);
      }
      return cur;
    }

    // Simple variable lookup
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(expr)) {
      try {
        return resolveScopeVar(expr, scopes);
      } catch (e) {
        if (e instanceof PyError) {
          throw new PyError(e.errorType, e.message, line);
        }
        throw e;
      }
    }

    throw new PyError('SyntaxError', `無法解析運算式: ${expr}`, line);
  };

  const applyOp = (cur: PyRuntimeVal | undefined, op: string, rhs: PyRuntimeVal, line: number): PyRuntimeVal => {
    if (op === '=') return rhs;
    if (cur === undefined) throw new PyError('UnboundLocalError', '變數在賦值前尚未定義', line);
    if (op === '+=') {
      if (typeof cur === 'string' && typeof rhs === 'string') return cur + rhs;
      if (isValidNumber(cur) && isValidNumber(rhs)) return cur + rhs;
    }
    if (isValidNumber(cur) && isValidNumber(rhs)) {
      if (op === '-=') return cur - rhs;
      if (op === '*=') return cur * rhs;
      if (op === '/=') {
        if (rhs === 0) throw new PyError('ZeroDivisionError', '除數不可為零', line);
        return cur / rhs;
      }
    }
    throw new PyError('TypeError', `不支援運算子 '${op}' 於此型別`, line);
  };

  const execBlock = (
    stmts: AstStmt[],
    scopes: Array<Map<string, PyRuntimeVal>>,
    activeSelfId: string | null,
    activeMethodLabel: string | null
  ) => {
    const isTopLevel = scopes.length === 1;
    for (const stmt of stmts) {
      if (stmt.type === 'pass') continue;

      if (stmt.type === 'class') {
        if (stmt.parentName && !classes.has(stmt.parentName)) {
          throw new PyError('NameError', `父類別 '${stmt.parentName}' 尚未定義`, stmt.line);
        }
        const classAttributes: Record<string, PyRuntimeVal> = {};
        for (const cv of stmt.classVars) {
          classAttributes[cv.name] = evalExpr(cv.expr, scopes, cv.line);
        }
        const methods: Record<string, PyMethodDef> = {};
        for (const m of stmt.methods) {
          methods[m.name] = m;
        }
        classes.set(stmt.name, {
          name: stmt.name,
          parentName: stmt.parentName,
          classAttributes,
          methods,
          line: stmt.line,
        });
        recordStep(
          stmt.line,
          `class ${stmt.name}${stmt.parentName ? `(${stmt.parentName})` : ''}:`,
          stmt.parentName
            ? `定義類別藍圖 ${stmt.name}，繼承自父類別 ${stmt.parentName}`
            : `定義類別藍圖 ${stmt.name}（包含 ${Object.keys(classAttributes).length} 個類別屬性與 ${Object.keys(methods).length} 個方法）`,
          activeSelfId,
          activeMethodLabel
        );
        continue;
      }

      if (stmt.type === 'def') {
        functions.set(stmt.name, { params: stmt.params, body: stmt.body, line: stmt.line });
        continue;
      }

      if (stmt.type === 'assign') {
        const rhsVal = evalExpr(stmt.expr, scopes, stmt.line);

        if (stmt.target.includes('.')) {
          const lastDot = stmt.target.lastIndexOf('.');
          const receiverExpr = stmt.target.slice(0, lastDot);
          const attrName = stmt.target.slice(lastDot + 1);
          const receiverVal = evalExpr(receiverExpr, scopes, stmt.line);

          if (receiverVal && typeof receiverVal === 'object' && receiverVal.kind === 'instance') {
            const inst = instances.get(receiverVal.id)!;
            const prevVal =
              attrName in inst.attributes
                ? inst.attributes[attrName]
                : lookupClassAttr(inst.className, attrName);
            const nextVal = applyOp(prevVal, stmt.op, rhsVal, stmt.line);
            inst.attributes[attrName] = nextVal;
            recordStep(
              stmt.line,
              `${stmt.target} ${stmt.op} ${stmt.expr}`,
              `將 ${inst.className} 實體 (${inst.id}) 的屬性 .${attrName} 設為 ${formatPyValue(nextVal, instances, true)}`,
              inst.id,
              activeMethodLabel
            );
            continue;
          }

          if (receiverVal && typeof receiverVal === 'object' && receiverVal.kind === 'class') {
            const cls = classes.get(receiverVal.name)!;
            const prevVal = cls.classAttributes[attrName];
            const nextVal = applyOp(prevVal, stmt.op, rhsVal, stmt.line);
            cls.classAttributes[attrName] = nextVal;
            recordStep(
              stmt.line,
              `${stmt.target} ${stmt.op} ${stmt.expr}`,
              `更新類別 ${cls.name} 的共用類別屬性 .${attrName} 為 ${formatPyValue(nextVal, instances, true)}`,
              activeSelfId,
              activeMethodLabel
            );
            continue;
          }

          throw new PyError('AttributeError', `無法設定屬性 '${attrName}'`, stmt.line);
        }

        const currentScope = scopes[scopes.length - 1];
        const nextVal = applyOp(currentScope.get(stmt.target), stmt.op, rhsVal, stmt.line);
        currentScope.set(stmt.target, nextVal);

        if (isTopLevel) {
          let desc = `將變數 ${stmt.target} 綁定至 ${formatPyValue(nextVal, instances, true)}`;
          if (nextVal && typeof nextVal === 'object' && nextVal.kind === 'instance') {
            const inst = instances.get(nextVal.id);
            desc = `從 ${inst?.className} 建立新實體 ${nextVal.id}，並將變數 ${stmt.target} 指向該記憶體位置`;
          }
          recordStep(stmt.line, `${stmt.target} ${stmt.op} ${stmt.expr}`, desc, activeSelfId, activeMethodLabel);
        }
        continue;
      }

      if (stmt.type === 'return') {
        const retVal = stmt.expr ? evalExpr(stmt.expr, scopes, stmt.line) : null;
        throw new ReturnSignal(retVal);
      }

      if (stmt.type === 'if') {
        for (const branch of stmt.branches) {
          if (branch.cond === null || isTruthy(evalExpr(branch.cond, scopes, branch.line))) {
            execBlock(branch.body, scopes, activeSelfId, activeMethodLabel);
            break;
          }
        }
        continue;
      }

      if (stmt.type === 'for') {
        const iterVal = evalExpr(stmt.iterExpr, scopes, stmt.line);
        if (!iterVal || typeof iterVal !== 'object' || iterVal.kind !== 'list') {
          throw new PyError('TypeError', 'for 迴圈需要可迭代的串列或 range()', stmt.line);
        }
        const curScope = scopes[scopes.length - 1];
        for (const item of iterVal.items) {
          curScope.set(stmt.varName, item);
          execBlock(stmt.body, scopes, activeSelfId, activeMethodLabel);
        }
        continue;
      }

      if (stmt.type === 'while') {
        let guard = 0;
        while (isTruthy(evalExpr(stmt.cond, scopes, stmt.line))) {
          guard++;
          if (guard > 500) {
            throw new PyError('RuntimeError', '偵測到超過 500 次迴圈執行，已安全中止', stmt.line);
          }
          execBlock(stmt.body, scopes, activeSelfId, activeMethodLabel);
        }
        continue;
      }

      if (stmt.type === 'expr') {
        const outLenBefore = output.length;
        evalExpr(stmt.expr, scopes, stmt.line);
        if (isTopLevel || output.length > outLenBefore) {
          let desc = `執行運算式 ${stmt.expr}`;
          if (output.length > outLenBefore) {
            desc = `輸出結果至終端機：${output[output.length - 1]}`;
          } else if (stmt.expr.includes('.')) {
            desc = `呼叫方法 ${stmt.expr}`;
          }
          recordStep(stmt.line, stmt.expr, desc, activeSelfId, activeMethodLabel);
        }
      }
    }
  };

  try {
    const rawLines = preprocessLines(source);
    if (rawLines.length === 0) {
      return {
        success: true,
        error: null,
        steps: [],
        output: [],
        classes: [],
        instances: [],
        variables: [],
      };
    }
    const parsed = parseBlock(rawLines, 0, 0);
    execBlock(parsed.stmts, [globalScope], null, null);
    return {
      success: true,
      error: null,
      steps,
      output,
      classes: snapshotClasses(),
      instances: snapshotInstances(),
      variables: snapshotVariables(),
    };
  } catch (err) {
    if (err instanceof PyError) {
      return {
        success: false,
        error: {
          line: err.line,
          type: err.errorType,
          message: err.message,
        },
        steps,
        output,
        classes: snapshotClasses(),
        instances: snapshotInstances(),
        variables: snapshotVariables(),
      };
    }
    return {
      success: false,
      error: {
        line: 0,
        type: 'RuntimeError',
        message: err instanceof Error ? err.message : '執行發生未預期錯誤',
      },
      steps,
      output,
      classes: snapshotClasses(),
      instances: snapshotInstances(),
      variables: snapshotVariables(),
    };
  }
}
