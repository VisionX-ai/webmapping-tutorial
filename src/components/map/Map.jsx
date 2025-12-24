import React, { useState, UseEffect, useRef, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  LayersControl,
  LayerGroup,
  Popup,
  Marker,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

const Map = () => {
  const [geoData, setGeoData] = useState(null);
  const position = [0.306742, 34.753909];
  const mapRef = useRef();

  useEffect(() => {
    fetch("/data/centralwest.geojson")
      .then((res) => res.json())
      .then((data) => setGeoData(data))
      .catch((err) => console.error("Failed to load GeoJSON", err));
  });
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

          {geoData && <GeoJSON data={geoData} />}
        </MapContainer>
      </div>
    </>
  );
};

export default Map;
