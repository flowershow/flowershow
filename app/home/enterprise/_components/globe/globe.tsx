"use client";
import React, { useEffect, useState } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";
import { MeshPhongMaterial } from "three";
import countries from "./coordinates.json";
import cities from "./cities.json";
/* import travelHistory from "./flights.json";
 * import airportHistory from "./airports.json"; */

function DatopianGlobe() {
  const ref = React.useRef<GlobeMethods>();
  const [arcsData, setArcsData] = useState<
    {
      id: number;
      startLat: number;
      startLng: number;
      endLat: number;
      endLng: number;
    }[]
  >([]);
  const [autoRotate, setAutoRotate] = useState(true);
  const [transparentMaterial, setTransparentMaterial] =
    useState<MeshPhongMaterial>();

  // Generate arcs data
  useEffect(() => {
    //  Transparent material to hide polygons
    //  This way the label works more consistently
    setTransparentMaterial(
      new MeshPhongMaterial({ transparent: true, opacity: 0 }),
    );

    // set arcs
    const N = cities.length;
    const calculatedArcs = [...Array(N).keys()].map((y, i) => {
      const cityA = cities[Math.floor(Math.random() * N)];
      const cityB = cities[Math.floor(Math.random() * N)];
      return {
        id: i,
        startLat: cityA!.latitude,
        startLng: cityA!.longitude,
        endLat: cityB!.latitude,
        endLng: cityB!.longitude,
      };
    });
    setArcsData(calculatedArcs);

    // set controls
    const controls = ref.current!.controls();

    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minDistance = 325;
    controls.maxDistance = 325;
    controls.rotateSpeed = 0.5;
    /* controls.zoomSpeed = 1; */
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.35;
    controls.minPolarAngle = Math.PI / 3.5;
    controls.maxPolarAngle = Math.PI - Math.PI / 3;

    //  Focus Saudi Arabia
    ref.current!.pointOfView({ lat: 24.774265, lng: 46.738586 });
  }, []);

  useEffect(() => {
    const controls = ref.current!.controls();
    controls.autoRotate = autoRotate;
  }, [autoRotate]);

  return (
    <Globe
      ref={ref}
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
      backgroundColor="rgba(0, 0, 0, 0)"
      width={700}
      height={700}
      polygonsData={countries.features}
      hexPolygonsData={countries.features}
      hexPolygonMargin={0.3}
      hexPolygonResolution={3}
      hexPolygonColor={(e) => "#d9711c"}
      polygonCapMaterial={transparentMaterial}
      polygonSideColor={(e) => "#fb923c"}
      atmosphereColor="#fb923c"
      atmosphereAltitude={0.1}
      arcsData={arcsData}
      arcColor={(e) => "#fb923c"}
      arcAltitude={(e) => 0.25}
      arcStroke={(e) => 0.6}
      arcDashLength={0.9}
      arcCurveResolution={32}
      arcDashGap={100}
      arcDashAnimateTime={1000}
      arcsTransitionDuration={1250}
      arcDashInitialGap={(e: any) => e.id / 5}
      onPolygonHover={(hoverD) => setAutoRotate(!hoverD)}
      onArcHover={(hoverD) => setAutoRotate(!hoverD)}
      showAtmosphere={true}
    />
  );
}

export default DatopianGlobe;
