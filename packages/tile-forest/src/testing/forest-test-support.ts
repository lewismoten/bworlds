export class FakeGeometry {
  attributes: Record<string, unknown> = {};
  args: number[];
  constructor(...args: number[]) {
    this.args = args;
  }
  setAttribute(name: string, attribute: unknown) {
    this.attributes[name] = attribute;
    return this;
  }
}

export class FakeMaterial {
  opacity?: number;
  emissiveIntensity?: number;
  uniforms?: Record<string, { value: unknown }>;
  constructor(public options: Record<string, unknown> = {}) {
    if (typeof options.opacity === 'number') {
      this.opacity = options.opacity;
    }
    if (typeof options.emissiveIntensity === 'number') {
      this.emissiveIntensity = options.emissiveIntensity;
    }
    if (options.uniforms && typeof options.uniforms === 'object') {
      this.uniforms = options.uniforms as Record<string, { value: unknown }>;
    }
  }
}

export class FakeNode {
  position = {
    x: 0,
    y: 0,
    z: 0,
    set: (x: number, y: number, z: number) => {
      this.position.x = x;
      this.position.y = y;
      this.position.z = z;
      return this.position;
    },
  };
  rotation = { x: 0, y: 0, z: 0 };
  scale = {
    x: 1,
    y: 1,
    z: 1,
    set: (x: number, y: number, z: number) => {
      this.scale.x = x;
      this.scale.y = y;
      this.scale.z = z;
      return this.scale;
    },
    setScalar: (value: number) => {
      this.scale.x = value;
      this.scale.y = value;
      this.scale.z = value;
      return this.scale;
    },
  };
  userData?: Record<string, unknown>;
  visible = true;
  children: FakeNode[] = [];
  add(...children: FakeNode[]) {
    this.children.push(...children);
    return this;
  }
  traverse(visit: (child: FakeNode) => void) {
    visit(this);
    this.children.forEach((child) => child.traverse(visit));
  }
}

export class FakeGroup extends FakeNode {}

export class FakeMesh extends FakeNode {
  constructor(
    public geometry?: object,
    public material?: FakeMaterial | FakeMaterial[]
  ) {
    super();
  }
}

export class FakePointLight extends FakeNode {
  constructor(
    public color?: string,
    public intensity = 0,
    public distance?: number,
    public decay?: number
  ) {
    super();
  }
}

export class FakeMatrix4 {
  elements = Array<number>(16).fill(0);
  scale = { x: 1, y: 1, z: 1 };
  position = { x: 0, y: 0, z: 0 };
  makeScale(x: number, y: number, z: number) {
    this.scale = { x, y, z };
    return this;
  }
  setPosition(x: number, y: number, z: number) {
    this.position = { x, y, z };
    return this;
  }
  set(
    n11: number,
    n12: number,
    n13: number,
    n14: number,
    n21: number,
    n22: number,
    n23: number,
    n24: number,
    n31: number,
    n32: number,
    n33: number,
    n34: number,
    n41: number,
    n42: number,
    n43: number,
    n44: number
  ) {
    this.elements = [
      n11,
      n12,
      n13,
      n14,
      n21,
      n22,
      n23,
      n24,
      n31,
      n32,
      n33,
      n34,
      n41,
      n42,
      n43,
      n44,
    ];
    this.position = { x: n14, y: n24, z: n34 };
    return this;
  }
  clone() {
    const next = new FakeMatrix4();
    next.elements = [...this.elements];
    next.scale = { ...this.scale };
    next.position = { ...this.position };
    return next;
  }
}

export class FakeFloat32BufferAttribute {
  array: number[];
  needsUpdate = false;
  constructor(
    values: ArrayLike<number> | number[],
    public itemSize: number
  ) {
    this.array = Array.from(values);
  }
}

export class FakeInstancedMesh extends FakeNode {
  matrices: FakeMatrix4[] = [];
  constructor(
    public geometry?: object,
    public material?: FakeMaterial | FakeMaterial[],
    public count = 0
  ) {
    super();
  }
  setMatrixAt(index: number, matrix: FakeMatrix4) {
    this.matrices[index] = matrix.clone();
  }
}

export class FakePoints extends FakeNode {
  constructor(
    public geometry?: FakeGeometry,
    public material?: FakeMaterial | FakeMaterial[]
  ) {
    super();
  }
}

export const fakeThree = {
  BufferGeometry: FakeGeometry,
  Group: FakeGroup,
  InstancedMesh: FakeInstancedMesh,
  Matrix4: FakeMatrix4,
  Mesh: FakeMesh,
  Points: FakePoints,
  PointLight: FakePointLight,
  MeshStandardMaterial: FakeMaterial,
  PointsMaterial: FakeMaterial,
  ShaderMaterial: FakeMaterial,
  CanvasTexture: class {
    colorSpace = '';
    needsUpdate = false;
  },
  Float32BufferAttribute: FakeFloat32BufferAttribute,
  CylinderGeometry: FakeGeometry,
  SphereGeometry: FakeGeometry,
  AdditiveBlending: 'additive',
} as const;

export function createFakeThreeHost() {
  return {
    BufferGeometry: FakeGeometry,
    Group: FakeGroup,
    InstancedMesh: FakeInstancedMesh,
    Matrix4: FakeMatrix4,
    Mesh: FakeMesh,
    Points: FakePoints,
    PointLight: FakePointLight,
    MeshStandardMaterial: FakeMaterial,
    PointsMaterial: FakeMaterial,
    ShaderMaterial: FakeMaterial,
    CanvasTexture: class {
      colorSpace = '';
      needsUpdate = false;
    },
    Float32BufferAttribute: FakeFloat32BufferAttribute,
    CylinderGeometry: FakeGeometry,
    SphereGeometry: FakeGeometry,
    AdditiveBlending: 'additive',
  } as const;
}

export function createForestTestState(
  playerX = 0,
  playerY = 0,
  tiles: Record<string, { kind: string }> = {}
) {
  return {
    player: { x: playerX, y: playerY, facing: 0 },
    getCurrentContext() {
      return { id: 'overworld', type: 'overworld', depth: 0 };
    },
    getCurrentTile(x = playerX, y = playerY) {
      return tiles[`${x}:${y}`] ?? { kind: 'forest' };
    },
    getTileDefinition() {
      return {
        name: 'Forest',
        color: '#000000',
        miniColor: '#111111',
        walkable: true,
        wallHeight: 0.38,
      };
    },
  };
}
