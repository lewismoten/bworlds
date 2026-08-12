import type { Kind } from '@bworlds/plugin-api';

export type TerrainRouteGeometryMode = 'splat' | 'geometry';

export type TerrainRouteGeometryReason =
  | 'bridge-structure'
  | 'tunnel-structure'
  | 'raised-causeway'
  | 'stairs-required'
  | 'retaining-wall-required'
  | 'unsupported-route-case'
  | 'flat-route-splat-supported';

export type TerrainRouteGeometryPlan = {
  mode: TerrainRouteGeometryMode;
  needsRoadGeometryFallback: boolean;
  keepBridgeGeometry: boolean;
  keepTunnelGeometry: boolean;
  keepCausewayGeometry: boolean;
  keepStairsGeometry: boolean;
  keepRetainingWallGeometry: boolean;
  reason: TerrainRouteGeometryReason;
};

export function createTerrainRouteGeometryPlan(params: {
  kind: Kind;
  bridgeLike?: boolean;
  tunnelLike?: boolean;
  raisedCausewayLike?: boolean;
  requiresSteps?: boolean;
  retainingWallHeight?: number;
  surfaceHeightDelta?: number;
  unsupportedShape?: boolean;
}): TerrainRouteGeometryPlan {
  if (params.bridgeLike || params.kind === 'bridge') {
    return createGeometryPlan('bridge-structure', {
      keepBridgeGeometry: true,
    });
  }

  if (params.tunnelLike) {
    return createGeometryPlan('tunnel-structure', {
      keepTunnelGeometry: true,
    });
  }

  if (params.raisedCausewayLike || (params.surfaceHeightDelta ?? 0) >= 0.32) {
    return createGeometryPlan('raised-causeway', {
      keepCausewayGeometry: true,
    });
  }

  if (params.requiresSteps || isStairKind(params.kind)) {
    return createGeometryPlan('stairs-required', {
      keepStairsGeometry: true,
    });
  }

  if ((params.retainingWallHeight ?? 0) >= 0.16) {
    return createGeometryPlan('retaining-wall-required', {
      keepRetainingWallGeometry: true,
    });
  }

  if (params.unsupportedShape) {
    return createGeometryPlan('unsupported-route-case', {});
  }

  return {
    mode: 'splat',
    needsRoadGeometryFallback: false,
    keepBridgeGeometry: false,
    keepTunnelGeometry: false,
    keepCausewayGeometry: false,
    keepStairsGeometry: false,
    keepRetainingWallGeometry: false,
    reason: 'flat-route-splat-supported',
  };
}

function createGeometryPlan(
  reason: Exclude<TerrainRouteGeometryReason, 'flat-route-splat-supported'>,
  flags: Partial<
    Pick<
      TerrainRouteGeometryPlan,
      | 'keepBridgeGeometry'
      | 'keepTunnelGeometry'
      | 'keepCausewayGeometry'
      | 'keepStairsGeometry'
      | 'keepRetainingWallGeometry'
    >
  >
): TerrainRouteGeometryPlan {
  return {
    mode: 'geometry',
    needsRoadGeometryFallback: reason === 'unsupported-route-case',
    keepBridgeGeometry: flags.keepBridgeGeometry === true,
    keepTunnelGeometry: flags.keepTunnelGeometry === true,
    keepCausewayGeometry: flags.keepCausewayGeometry === true,
    keepStairsGeometry: flags.keepStairsGeometry === true,
    keepRetainingWallGeometry: flags.keepRetainingWallGeometry === true,
    reason,
  };
}

function isStairKind(kind: Kind): boolean {
  return kind === 'stairsUp' || kind === 'stairsDown';
}
