"""
Standard Ordnance Survey OSGB36 (Airy 1830) to WGS84 (ETRS89) datum transformation.
Uses the standard published Ordnance Survey 7-parameter Helmert transformation.

Reference:
  Ordnance Survey: "A guide to coordinate systems in Great Britain" (D00659_v2.3)
"""
import math
from typing import Tuple

# Airy 1830 Ellipsoid parameters
AIRY_A = 6377563.396
AIRY_B = 6356256.909
AIRY_F0 = 0.9996012717
AIRY_LAT0 = math.radians(49.0)
AIRY_LON0 = math.radians(-2.0)
AIRY_N0 = -100000.0
AIRY_E0 = 400000.0
AIRY_E2 = 1.0 - (AIRY_B * AIRY_B) / (AIRY_A * AIRY_A)
AIRY_N = (AIRY_A - AIRY_B) / (AIRY_A + AIRY_B)

# Helmert Transformation: OSGB36 -> WGS84
# 7 parameters published by Ordnance Survey
TX = 446.448
TY = -125.157
TZ = 542.060
S = -20.4894e-6
SEC_TO_RAD = math.pi / (180.0 * 3600.0)
RX = 0.1502 * SEC_TO_RAD
RY = 0.2470 * SEC_TO_RAD
RZ = 0.8421 * SEC_TO_RAD

# WGS84 Ellipsoid parameters
WGS_A = 6378137.0
WGS_B = 6356752.314245
WGS_E2 = 1.0 - (WGS_B * WGS_B) / (WGS_A * WGS_A)
WGS_EP2 = (WGS_A * WGS_A - WGS_B * WGS_B) / (WGS_B * WGS_B)


def osgb36_to_wgs84(easting: float, northing: float, height: float = 0.0) -> Tuple[float, float]:
    """
    Convert British National Grid (Easting, Northing in metres) to WGS84 Latitude and Longitude (degrees).
    """
    n2 = AIRY_N * AIRY_N
    n3 = AIRY_N * AIRY_N * AIRY_N

    # 1. Iterate to find initial latitude phi_prime on Airy 1830
    phi_prime = (northing - AIRY_N0) / (AIRY_A * AIRY_F0) + AIRY_LAT0
    while True:
        m_arc = AIRY_B * AIRY_F0 * (
            (1.0 + AIRY_N + (5.0 / 4.0) * (n2 + n3)) * (phi_prime - AIRY_LAT0)
            - (3.0 * AIRY_N + 3.0 * n2 + (21.0 / 8.0) * n3) * math.sin(phi_prime - AIRY_LAT0) * math.cos(phi_prime + AIRY_LAT0)
            + ((15.0 / 8.0) * (n2 + n3)) * math.sin(2.0 * (phi_prime - AIRY_LAT0)) * math.cos(2.0 * (phi_prime + AIRY_LAT0))
            - ((35.0 / 24.0) * n3) * math.sin(3.0 * (phi_prime - AIRY_LAT0)) * math.cos(3.0 * (phi_prime + AIRY_LAT0))
        )
        diff = northing - AIRY_N0 - m_arc
        if abs(diff) < 1e-6:
            break
        phi_prime += diff / (AIRY_A * AIRY_F0)

    # 2. Compute transverse mercator parameters at phi_prime
    sin_phi = math.sin(phi_prime)
    cos_phi = math.cos(phi_prime)
    tan_phi = math.tan(phi_prime)
    tan2_phi = tan_phi * tan_phi
    tan4_phi = tan2_phi * tan2_phi
    tan6_phi = tan4_phi * tan2_phi
    sec_phi = 1.0 / cos_phi

    nu = AIRY_A * AIRY_F0 / math.sqrt(1.0 - AIRY_E2 * sin_phi * sin_phi)
    rho = AIRY_A * AIRY_F0 * (1.0 - AIRY_E2) / ((1.0 - AIRY_E2 * sin_phi * sin_phi) ** 1.5)
    eta2 = nu / rho - 1.0

    vii = tan_phi / (2.0 * rho * nu)
    viii = (tan_phi / (24.0 * rho * nu ** 3)) * (5.0 + 3.0 * tan2_phi + eta2 - 9.0 * tan2_phi * eta2)
    ix = (tan_phi / (720.0 * rho * nu ** 5)) * (61.0 + 90.0 * tan2_phi + 45.0 * tan4_phi)
    x = sec_phi / nu
    xi = (sec_phi / (6.0 * nu ** 3)) * (nu / rho + 2.0 * tan2_phi)
    xii = (sec_phi / (120.0 * nu ** 5)) * (5.0 + 28.0 * tan2_phi + 24.0 * tan4_phi)
    xiia = (sec_phi / (5040.0 * nu ** 7)) * (61.0 + 662.0 * tan2_phi + 1320.0 * tan4_phi + 720.0 * tan6_phi)

    de = easting - AIRY_E0
    phi_airy = phi_prime - vii * (de ** 2) + viii * (de ** 4) - ix * (de ** 6)
    lon_airy = AIRY_LON0 + x * de - xi * (de ** 3) + xii * (de ** 5) - xiia * (de ** 7)

    # 3. 3D Cartesian coordinates on Airy 1830
    sin_p = math.sin(phi_airy)
    cos_p = math.cos(phi_airy)
    sin_l = math.sin(lon_airy)
    cos_l = math.cos(lon_airy)
    nu_airy = AIRY_A / math.sqrt(1.0 - AIRY_E2 * sin_p * sin_p)
    x1 = (nu_airy + height) * cos_p * cos_l
    y1 = (nu_airy + height) * cos_p * sin_l
    z1 = ((1.0 - AIRY_E2) * nu_airy + height) * sin_p

    # 4. Helmert transformation: Airy 1830 -> WGS84
    x2 = x1 + TX + S * x1 - RZ * y1 + RY * z1
    y2 = y1 + TY + RZ * x1 + S * y1 - RX * z1
    z2 = z1 + TZ - RY * x1 + RX * y1 + S * z1

    # 5. Convert WGS84 Cartesian to geodetic lat/lon (Bowring's method)
    p = math.sqrt(x2 * x2 + y2 * y2)
    theta = math.atan2(z2 * WGS_A, p * WGS_B)

    lat_wgs = math.atan2(
        z2 + WGS_EP2 * WGS_B * (math.sin(theta) ** 3),
        p - WGS_E2 * WGS_A * (math.cos(theta) ** 3),
    )
    lon_wgs = math.atan2(y2, x2)

    return round(math.degrees(lat_wgs), 6), round(math.degrees(lon_wgs), 6)
