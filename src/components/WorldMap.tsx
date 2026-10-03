import * as d3 from 'd3';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, Geometry } from 'geojson';
import { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSize } from './charts';
import { useTooltip } from './Tooltip';

type GeoFeature = Feature<Geometry, { name: string }> & { id: string | null };

let worldPromise: Promise<GeoFeature[]> | null = null;
export function loadWorld() {
  worldPromise ??= fetch(`${import.meta.env.BASE_URL}data/world.json`)
    .then((r) => r.json())
    .then((topo: Topology) => (feature(topo, topo.objects.countries as GeometryCollection) as unknown as { features: GeoFeature[] }).features.filter((f) => f.properties.name !== 'Antarctica'));
  return worldPromise;
}

export interface WorldMapHandle {
  flyTo: (iso3: string) => Promise<void>;
}

interface Props {
  mode: 'globe' | 'flat';
  fillFor: (iso3: string | null) => string;
  tooltipFor: (iso3: string | null, name: string) => ReactNode;
  onSelect: (iso3: string) => void;
  selected?: string | null;
  autoSpin?: boolean;
  height?: number;
}

const Paths = memo(function Paths({
  features,
  path,
  fillFor,
  selected,
  onEnter,
  onLeave,
  onClick,
}: {
  features: GeoFeature[];
  path: d3.GeoPath;
  fillFor: (iso3: string | null) => string;
  selected?: string | null;
  onEnter: (e: React.MouseEvent, f: GeoFeature) => void;
  onLeave: () => void;
  onClick: (f: GeoFeature) => void;
}) {
  return (
    <g>
      {features.map((f, i) => {
        const d = path(f);
        if (!d) return null;
        const sel = f.id === selected;
        return (
          <path
            key={(f.id ?? 'x') + i}
            d={d}
            fill={fillFor(f.id)}
            stroke={sel ? 'var(--accent)' : 'var(--surface)'}
            strokeWidth={sel ? 2 : 0.5}
            style={{ cursor: f.id ? 'pointer' : 'default', transition: 'fill 0.35s ease' }}
            onMouseMove={(e) => onEnter(e, f)}
            onMouseLeave={onLeave}
            onClick={() => onClick(f)}
          />
        );
      })}
    </g>
  );
});

export const WorldMap = forwardRef<WorldMapHandle, Props>(function WorldMap({ mode, fillFor, tooltipFor, onSelect, selected, autoSpin = true, height = 520 }, ref) {
  const [box, width] = useSize<HTMLDivElement>();
  const [features, setFeatures] = useState<GeoFeature[]>([]);
  const [rotation, setRotation] = useState<[number, number]>([-10, -20]);
  const [scaleK, setScaleK] = useState(1);
  const [hovered, setHovered] = useState<string | null>(null);
  const tip = useTooltip();
  const dragging = useRef(false);
  const spinning = useRef(autoSpin);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    loadWorld().then(setFeatures);
  }, []);

  // Gentle auto-rotation of the globe until the user interacts
  useEffect(() => {
    if (mode !== 'globe') return;
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      if (spinning.current && !dragging.current && !document.hidden) {
        const dt = t - last;
        setRotation(([l, p]) => [l + dt * 0.006, p]);
      }
      last = t;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode]);

  const projection = useMemo(() => {
    const w = Math.max(width, 10);
    if (mode === 'globe') {
      const r = Math.min(w, height) / 2 - 12;
      return d3.geoOrthographic().scale(r * scaleK).translate([w / 2, height / 2]).rotate([rotation[0], rotation[1], 0]).clipAngle(90);
    }
    return d3.geoEqualEarth().fitExtent([[8, 8], [w - 8, height - 8]], { type: 'Sphere' });
  }, [mode, width, height, rotation, scaleK]);

  const path = useMemo(() => d3.geoPath(projection), [projection]);

  // Drag to rotate (globe) + wheel zoom
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || mode !== 'globe') return;
    const sel = d3.select(svg);
    let start: [number, number] = [0, 0];
    let rot0: [number, number] = [0, 0];
    sel.call(
      d3
        .drag<SVGSVGElement, unknown>()
        .on('start', (e) => {
          dragging.current = true;
          spinning.current = false;
          start = [e.x, e.y];
          setRotation((r) => ((rot0 = r), r));
        })
        .on('drag', (e) => {
          const k = 0.25 / scaleK;
          setRotation([rot0[0] + (e.x - start[0]) * k, Math.max(-70, Math.min(70, rot0[1] - (e.y - start[1]) * k))]);
        })
        .on('end', () => {
          dragging.current = false;
        }),
    );
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScaleK((k) => Math.max(0.8, Math.min(4, k * (e.deltaY > 0 ? 0.92 : 1.08))));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      sel.on('.drag', null);
      svg.removeEventListener('wheel', onWheel);
    };
  }, [mode, scaleK]);

  useImperativeHandle(
    ref,
    () => ({
      flyTo: (iso3: string) =>
        new Promise<void>((resolve) => {
          const f = features.find((x) => x.id === iso3);
          if (!f || mode !== 'globe') return resolve();
          spinning.current = false;
          const [lon, lat] = d3.geoCentroid(f);
          let from: [number, number] = [0, 0];
          setRotation((r) => ((from = r), r));
          const target: [number, number] = [-lon, -lat];
          // shortest way round
          let dl = target[0] - from[0];
          dl = ((((dl + 180) % 360) + 360) % 360) - 180;
          const interp = (t: number): [number, number] => [from[0] + dl * t, from[1] + (target[1] - from[1]) * t];
          const t0 = performance.now();
          const dur = 1400;
          const step = (now: number) => {
            const t = Math.min(1, (now - t0) / dur);
            setRotation(interp(d3.easeCubicInOut(t)));
            if (t < 1) requestAnimationFrame(step);
            else resolve();
          };
          requestAnimationFrame(step);
        }),
    }),
    [features, mode],
  );

  const onEnter = useMemo(
    () => (e: React.MouseEvent, f: GeoFeature) => {
      setHovered(f.id);
      tip.show(e, tooltipFor(f.id, f.properties.name));
    },
    [tip, tooltipFor],
  );
  const onLeave = useMemo(
    () => () => {
      setHovered(null);
      tip.hide();
    },
    [tip],
  );
  const onClick = useMemo(() => (f: GeoFeature) => f.id && onSelect(f.id), [onSelect]);

  const hoveredFeature = hovered ? features.find((f) => f.id === hovered) : null;
  const sphere = path({ type: 'Sphere' }) ?? '';
  const graticule = useMemo(() => d3.geoGraticule10(), []);

  return (
    <div ref={box} style={{ width: '100%', height, position: 'relative' }}>
      {width > 0 && (
        <svg ref={svgRef} width={width} height={height} style={{ cursor: mode === 'globe' ? 'grab' : 'default', touchAction: 'none' }}>
          <defs>
            <radialGradient id="globe-shade" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="var(--surface)" stopOpacity={1} />
              <stop offset="100%" stopColor="var(--surface-2)" stopOpacity={1} />
            </radialGradient>
          </defs>
          <path d={sphere} fill={mode === 'globe' ? 'url(#globe-shade)' : 'var(--surface)'} stroke="var(--hairline)" />
          <path d={path(graticule) ?? ''} fill="none" stroke="var(--hairline)" strokeWidth={0.5} />
          <Paths features={features} path={path} fillFor={fillFor} selected={selected} onEnter={onEnter} onLeave={onLeave} onClick={onClick} />
          {hoveredFeature && hoveredFeature.id !== selected && (
            <path d={path(hoveredFeature) ?? ''} fill="none" stroke="var(--ink)" strokeWidth={1.25} pointerEvents="none" />
          )}
        </svg>
      )}
    </div>
  );
});
