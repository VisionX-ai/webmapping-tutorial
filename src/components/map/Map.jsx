import React, { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, Popup, Marker } from "react-leaflet";
import * as turf from "@turf/turf";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import "../map/style.css";

const Map = () => {
  const [geoData, setGeoData] = useState(null);
  const position = [0.306742, 34.753909];
  const mapRef = useRef();

  const milestoneColors = {
    0: { label: "Unopened", color: "#BCCFB4" },
    1: { label: "Milestone 1", color: "#69A761" },
    2: { label: "Milestone 2", color: "#27823B" },
    3: { label: "Milestone 3", color: "#09622A" },
  };

  useEffect(() => {
    fetch("/data/centralwest.geojson")
      .then((res) => res.json())
      .then((data) => setGeoData(data))
      .catch((err) => console.error("Failed to load GeoJSON", err));
  });

  // add legend

  useEffect(() => {
    if (!mapRef.current) return;

    const legend = L.control({ position: "bottomright" });

    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "legend");
      div.innerHTML = "<strong>Milestones</strong><br/>";

      Object.values(milestoneColors).forEach((m) => {
        div.innerHTML += `
        <i style="background: ${m.color}"></i> ${m.label} <br/>
       `;
      });

      return div;
    };

    legend.addTo(mapRef.current);
    return () => legend.remove();
  }, [milestoneColors]);

  // normalize the data
  const getProps = (feature) => feature?.properties || {};

  const getClusterName = (feature) => {
    const props = getProps(feature);
    return props.Cluster || props[" cl name"] || "Unknown";
  };
  const getMilestone = (feature) => {
    const props = getProps(feature);
    return Number(props.Milestone ?? 0);
  };

  // color for outline
  const geojsonColors = (feature) => {
    const milestone = getMilestone(feature);

    return {
      color: "#000",
      fillColor: milestoneColors[milestone]?.color || "374151",
      weight: 2,
      fillOpacity: 1,
    };
  };

  const onEachFeature = (feature, layer) => {
    const clusterName = getClusterName(feature);
    const milestone = getMilestone(feature);

    const milestoneLabel = milestoneColors[milestone]?.label || "Unknown";

    const areaSqKm = (turf.area(feature) / 1000000).toFixed(2);

    layer.bindTooltip(
      `
      <Strong> Cluster:</strong>${clusterName} <br/>
      <Strong> Milestone:</strong>${milestoneLabel} <br/>
      <Strong> Area:</strong>${areaSqKm} sqkm<br/>
      `,

      { sticky: true }
    );

    layer.on({
      mouserover: (e) => {
        e.target.setStyle({ weight: 3 });
      },
      mouseout: (e) => {
        e.target.setStyle(geojsonColors(feature));
      },

      click: () => {
        mapRef.current.fitBounds(layer.getBounds(), {
          padding: [20, 20],
        });
      },
    });
  };

  return (
    <>
      <div style={{ height: "600px" }}>
        <h1>Welcome to our new application.</h1>
        <MapContainer
          ref={mapRef}
          center={position}
          zoom={10}
          scrollWheelZoom={true}
          style={{
            height: "100%",
            width: "100%",
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[51.505, -0.09]}>
            <Popup>
              A pretty CSS3 popup. <br /> Easily customizable.
            </Popup>
          </Marker>

          {geoData && (
            <GeoJSON
              data={geoData}
              style={geojsonColors}
              onEachFeature={onEachFeature}
            />
          )}
        </MapContainer>
      </div>
    </>
  );
};

export default Map;
