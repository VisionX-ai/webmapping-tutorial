import React, { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, Popup, Marker } from "react-leaflet";
import * as turf from "@turf/turf";
import L from "leaflet";
import proj4 from "proj4";
import "leaflet/dist/leaflet.css";

import "../map/style.css";

const Map = () => {
  const [geoData, setGeoData] = useState(null);
  const [geologicalData, setGeologicalData] = useState(null);
  const [activeLayer, setActiveLayer] = useState("clusters"); // "clusters" or "geological"
  const position = [0.306742, 34.753909];
  const mapRef = useRef();

  const milestoneColors = {
    0: { label: "Unopened", color: "#BCCFB4" },
    1: { label: "Milestone 1", color: "#69A761" },
    2: { label: "Milestone 2", color: "#27823B" },
    3: { label: "Milestone 3", color: "#09622A" },
  };

  const geologicalColors = {
    "MC": { label: "Metamorphic complex", color: "#E63946" },
    "GR": { label: "Granite", color: "#F77F00" },
    "SED": { label: "Sedimentary", color: "#FCBF49" },
    "VOL": { label: "Volcanic", color: "#06A77D" },
    "default": { label: "Other", color: "#118AB2" },
  };

  // Define coordinate systems
  // UTM Zone 33S (EPSG:32733) - Common for Namibia region
  proj4.defs("EPSG:32733", "+proj=utm +zone=33 +south +datum=WGS84 +units=m +no_defs");
  // WGS84 (EPSG:4326) - Standard lat/long
  proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs");

  // Function to transform coordinates recursively
  const transformCoordinates = (coords) => {
    if (typeof coords[0] === 'number') {
      // This is a single coordinate pair [x, y]
      const [lon, lat] = proj4("EPSG:32733", "EPSG:4326", coords);
      return [lon, lat];
    } else {
      // This is an array of coordinates, recurse
      return coords.map(transformCoordinates);
    }
  };

  // Function to transform entire GeoJSON
  const transformGeoJSON = (geojson) => {
    const transformed = JSON.parse(JSON.stringify(geojson)); // Deep clone
    
    if (transformed.features) {
      transformed.features.forEach(feature => {
        if (feature.geometry && feature.geometry.coordinates) {
          feature.geometry.coordinates = transformCoordinates(feature.geometry.coordinates);
        }
      });
    }
    
    return transformed;
  };

  // Fetch centralwest data
  useEffect(() => {
    fetch("/data/centralwest.geojson")
      .then((res) => res.json())
      .then((data) => setGeoData(data))
      .catch((err) => console.error("Failed to load centralwest GeoJSON", err));
  }, []);

  // Fetch and transform geological data
  useEffect(() => {
    fetch("/data/geological_data.geojson")
      .then((res) => res.json())
      .then((data) => {
        console.log("Original geological data sample:", data.features[0].geometry.coordinates[0][0][0].slice(0, 2));
        const transformedData = transformGeoJSON(data);
        console.log("Transformed geological data sample:", transformedData.features[0].geometry.coordinates[0][0][0].slice(0, 2));
        setGeologicalData(transformedData);
      })
      .catch((err) => console.error("Failed to load geological GeoJSON", err));
  }, []);

  // add legend (updates based on active layer)

  useEffect(() => {
    if (!mapRef.current) return;

    const legend = L.control({ position: "bottomright" });

    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "legend");
      
      if (activeLayer === "clusters") {
        div.innerHTML = "<strong>Milestones</strong><br/>";
        Object.values(milestoneColors).forEach((m) => {
          div.innerHTML += `
          <i style="background: ${m.color}"></i> ${m.label} <br/>
         `;
        });
      } else {
        div.innerHTML = "<strong>Geology</strong><br/>";
        Object.values(geologicalColors).forEach((g) => {
          div.innerHTML += `
          <i style="background: ${g.color}"></i> ${g.label} <br/>
         `;
        });
      }

      return div;
    };

    legend.addTo(mapRef.current);
    return () => legend.remove();
  }, [activeLayer, milestoneColors]);

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

  // Get geological properties
  const getLithCode = (feature) => {
    const props = getProps(feature);
    return props.LITHCODE || "default";
  };

  const getGeologicalUnit = (feature) => {
    const props = getProps(feature);
    return props.UNIT || "Unknown";
  };

  // color for cluster layers
  const geojsonColors = (feature) => {
    const milestone = getMilestone(feature);

    return {
      color: "#000",
      fillColor: milestoneColors[milestone]?.color || "#374151",
      weight: 2,
      fillOpacity: 0.7,
    };
  };

  // color for geological layers
  const geologicalLayerColors = (feature) => {
    const lithCode = getLithCode(feature);

    return {
      color: "#000",
      fillColor: geologicalColors[lithCode]?.color || geologicalColors["default"].color,
      weight: 2,
      fillOpacity: 0.7,
    };
  };

  // Tooltips and interactions for cluster data
  const onEachFeature = (feature, layer) => {
    const clusterName = getClusterName(feature);
    const milestone = getMilestone(feature);

    const milestoneLabel = milestoneColors[milestone]?.label || "Unknown";

    const areaSqKm = (turf.area(feature) / 1000000).toFixed(2);

    layer.bindTooltip(
      `
      <strong>Cluster:</strong> ${clusterName} <br/>
      <strong>Milestone:</strong> ${milestoneLabel} <br/>
      <strong>Area:</strong> ${areaSqKm} sqkm<br/>
      `,
      { sticky: true }
    );

    layer.on({
      mouseover: (e) => {
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

  // Tooltips and interactions for geological data
  const onEachGeologicalFeature = (feature, layer) => {
    const unit = getGeologicalUnit(feature);
    const lithCode = getLithCode(feature);
    const props = getProps(feature);
    
    const areaSqKm = (turf.area(feature) / 1000000).toFixed(2);

    layer.bindTooltip(
      `
      <strong>Unit:</strong> ${unit} <br/>
      <strong>Lithology:</strong> ${lithCode} <br/>
      <strong>Area:</strong> ${areaSqKm} sqkm<br/>
      `,
      { sticky: true }
    );

    layer.on({
      mouseover: (e) => {
        e.target.setStyle({ weight: 3 });
      },
      mouseout: (e) => {
        e.target.setStyle(geologicalLayerColors(feature));
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
        
        {/* Layer Toggle Controls */}
        <div style={{ 
          marginBottom: "10px", 
          display: "flex", 
          gap: "10px",
          padding: "10px",
          backgroundColor: "#f5f5f5",
          borderRadius: "5px"
        }}>
          <button
            onClick={() => setActiveLayer("clusters")}
            style={{
              padding: "8px 16px",
              backgroundColor: activeLayer === "clusters" ? "#27823B" : "#fff",
              color: activeLayer === "clusters" ? "#fff" : "#000",
              border: "2px solid #27823B",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Clusters (Milestones)
          </button>
          <button
            onClick={() => setActiveLayer("geological")}
            style={{
              padding: "8px 16px",
              backgroundColor: activeLayer === "geological" ? "#E63946" : "#fff",
              color: activeLayer === "geological" ? "#fff" : "#000",
              border: "2px solid #E63946",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Geological Data
          </button>
        </div>

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

          {/* Render Clusters Layer */}
          {activeLayer === "clusters" && geoData && (
            <GeoJSON
              key="clusters"
              data={geoData}
              style={geojsonColors}
              onEachFeature={onEachFeature}
            />
          )}

          {/* Render Geological Layer */}
          {activeLayer === "geological" && geologicalData && (
            <GeoJSON
              key="geological"
              data={geologicalData}
              style={geologicalLayerColors}
              onEachFeature={onEachGeologicalFeature}
            />
          )}
        </MapContainer>
      </div>
    </>
  );
};

export default Map;
