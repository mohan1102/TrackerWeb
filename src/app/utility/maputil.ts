import { Injectable } from '@angular/core';

declare let L;
declare var moment: any;

@Injectable()
export class MapUtil {

    public geo = {
        initMap: function () {
            const map = L.map('map').setView([13.0234427, 80.16], 5);
            L.tileLayer('https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png').addTo(map);
            return map;
        },
        bearing: function (lat1, lng1, lat2, lng2) {
            const dLon = this._toRad(lng2 - lng1);
            const y = Math.sin(dLon) * Math.cos(this._toRad(lat2));
            const x = Math.cos(this._toRad(lat1)) * Math.sin(this._toRad(lat2)) -
                Math.sin(this._toRad(lat1)) * Math.cos(this._toRad(lat2)) * Math.cos(dLon);
            const brng = this._toDeg(Math.atan2(y, x));
            return ((brng + 360) % 360);
        },
        _toRad: function (deg) {
            return deg * Math.PI / 180;
        },
        _toDeg: function (rad) {
            return rad * 180 / Math.PI;
        },
        marker: function (lat, lng, icon, bearing, map, id, html) {
            const marker = L.marker([lat, lng],
                { icon: icon, rotationAngle: bearing }).addTo(map);
            marker['id'] = id;
            if (html !== '') {
                marker.bindPopup(html);
            }
            return marker;
        },
        moveMarker: function (lat1, lng1, lat2, lng2, icon, bearing, map, id, html) {
            const marker = L.Marker.movingMarker([[lat1, lng1], [lat2, lng2]],
                3000, { icon: icon, rotationAngle: bearing })
                .addTo(map);
            marker.start();
            marker['id'] = id;
            if (html !== '') {
                marker.bindPopup(html);
            }
            return marker;
        },
        clearMarker: function (marker, map) {
            if (marker !== undefined) {
                map.removeLayer(marker);
            }
        },
        clearMarkerArray: function (id, markers, map) {
            if (markers.length > 0) {
                for (let itr = 0; itr <= markers.length - 1; itr++) {
                    const tempMarker = markers[itr];
                    if (id === tempMarker.id) {
                        map.removeLayer(tempMarker);
                        markers.splice(itr, 1);
                        return tempMarker;
                    }
                }
            }
            const marker: any = { _latlng: { lat: '', lng: '' } };
            return marker;
        },
        mapIcon: function (transportType) {
            if (transportType === 'RUNNING') {
                const icon = L.icon({
                    iconUrl: 'assets/img/heading.png',
                    iconSize: [20, 20],
                    iconAnchor: [11, 24],
                    popupAnchor: [1, -34],
                    shadowSize: [0, 0]
                });
                return icon;
            } else if (transportType === 'PARKED') {
                const icon = L.icon({
                    iconUrl: 'assets/img/parking.svg',
                    iconSize: [25, 25],
                    iconAnchor: [11, 24],
                    popupAnchor: [1, -34],
                    shadowSize: [0, 0]
                });
                return icon;
            } else if (transportType === 'IDLE') {
                const icon = L.icon({
                    iconUrl: 'assets/img/orange_dot.png',
                    iconSize: [21, 29],
                    iconAnchor: [15, 30],
                    popupAnchor: [1, -34],
                    shadowSize: [0, 0]
                });
                return icon;
            } else if (transportType === 'DISCONNECT') {
                const icon = L.icon({
                    iconUrl: 'assets/img/red_dot.png',
                    iconSize: [20, 20],
                    iconAnchor: [15, 30],
                    popupAnchor: [1, -34],
                    shadowSize: [0, 0]
                });
                return icon;
            }
        },
        timeDiffrence: function (startDate, endDate) {
            const start_date = moment(startDate);
            const end_date = moment(endDate);
            const duration = end_date.diff(start_date, 'minutes');
            return duration;
        },
        distanceBetweenPoints: function (p1, p2) {
            if (!p1 || !p2) {
                return 0;
            }
            const R = 6371;
            const dLat = (p2.lat() - p1.lat()) * Math.PI / 180;
            const dLon = (p2.lng() - p1.lng()) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(p1.lat() * Math.PI / 180) * Math.cos(p2.lat() * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const d = R * c;
            return d;
        },
        parkingFinder: function (points) {
            const self = this;
            let park = { lat: '', lng: '', location: '', start: '', end: '', duration: '', power: '' };
            const totalPoints = points.length;
            const parked = [];
            Object.keys(points).map(function (index) {
                let itr = 1;
                const point = points[index];
                if (point.motion === 'PARKED') {
                    if (park.start === '') {
                        park.start = point.time;
                        park.location = 'Chennai';
                        park.power = point.power;
                    }

                    if (itr === totalPoints) {
                        park.lat = point.lat;
                        park.lng = point.lng;
                        park.end = point.time;
                        park.duration = self.timeDiffrence(park.start, park.end);
                        parked.push(park);
                        park = { lat: '', lng: '', location: '', start: '', end: '', duration: '', power: '' };
                    }
                } else {
                    if (park.start !== '') {
                        park.lat = point.lat;
                        park.lng = point.lng;
                        park.end = point.time;
                        park.duration = self.timeDiffrence(park.start, park.end);
                        parked.push(park);
                        park = { lat: '', lng: '', location: '', start: '', end: '', duration: '', power: '' };
                    }
                }
                itr++;
            });

            // Eliminate parking duration < 5min
            let parkedLen = parked.length;
            for (let itr = 0; itr <= parked.length - 1; itr++) {
                if (parked[itr].duration < 5) {
                    delete parked[itr];
                    parkedLen = parkedLen - 1;
                }
            }

            // Eliminate parking distance < 500m between two points
            if (parkedLen > 1) {
                Object.keys(parked).map(function (index) {
                    const p1 = { lat: parked[index].lat, lng: parked[index].lng };
                    const p2 = { lat: parked[index + 1].lat, lng: parked[index + 1].lng };
                });
            }
            return parked;
        }
    };
}
