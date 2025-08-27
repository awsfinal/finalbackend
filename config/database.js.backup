const { Pool } = require('pg');

// RDS 메인 DB 연결 설정
const mainDbConfig = {
  host: process.env.DB_HOST || 'final-db.cz420qs4q66k.ap-northeast-1.rds.amazonaws.com',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'jjikgeo',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // 최대 연결 수
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// 폴리곤 DB 연결 설정
const polygonDbConfig = {
  host: process.env.POLYGON_DB_HOST,
  port: process.env.POLYGON_DB_PORT || 5432,
  database: process.env.POLYGON_DB_NAME || 'polygons',
  user: process.env.POLYGON_DB_USER,
  password: process.env.POLYGON_DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// 연결 풀 생성
const mainDb = new Pool(mainDbConfig);
const polygonDb = new Pool(polygonDbConfig);

// 연결 테스트
async function testConnections() {
  try {
    // 메인 DB 연결 테스트
    const mainClient = await mainDb.connect();
    console.log('✅ 메인 DB 연결 성공');
    mainClient.release();

    // 폴리곤 DB 연결 테스트
    if (process.env.POLYGON_DB_HOST) {
      const polygonClient = await polygonDb.connect();
      console.log('✅ 폴리곤 DB 연결 성공');
      polygonClient.release();
    }
  } catch (error) {
    console.error('❌ DB 연결 실패:', error.message);
  }
}

// 관광지 데이터 조회
async function getTouristSpots(latitude, longitude, limit = 10) {
  const client = await mainDb.connect();
  try {
    const query = `
      SELECT 
        id, content_id, title, address, longitude, latitude,
        image_url, area_code, area_name, spot_category, tel,
        zipcode, homepage, info_center, rest_date, use_time,
        parking, facilities, overview, heritage_type, fee_type, usage_fee,
        created_at,
        ST_Distance(
          ST_Point(longitude, latitude)::geography,
          ST_Point($1, $2)::geography
        ) as distance
      FROM tourist_spots
      WHERE ST_DWithin(
        ST_Point(longitude, latitude)::geography,
        ST_Point($1, $2)::geography,
        10000
      )
      ORDER BY distance
      LIMIT $3
    `;
    
    const result = await client.query(query, [longitude, latitude, limit]);
    return result.rows;
  } finally {
    client.release();
  }
}

// 관광지 상세 정보 조회
async function getTouristSpotDetail(contentId) {
  const client = await mainDb.connect();
  try {
    const query = `
      SELECT * FROM tourist_spots 
      WHERE content_id = $1
    `;
    
    const result = await client.query(query, [contentId]);
    return result.rows[0];
  } finally {
    client.release();
  }
}

// 폴리곤 데이터 조회
async function getBuildingPolygons(bounds) {
  if (!process.env.POLYGON_DB_HOST) {
    return [];
  }

  const client = await polygonDb.connect();
  try {
    const query = `
      SELECT id, name, polygon_data, building_type, created_at
      FROM building_polygons
      WHERE ST_Intersects(
        polygon_data,
        ST_MakeEnvelope($1, $2, $3, $4, 4326)
      )
    `;
    
    const result = await client.query(query, [
      bounds.west, bounds.south, bounds.east, bounds.north
    ]);
    return result.rows;
  } finally {
    client.release();
  }
}

// 연결 종료
async function closeConnections() {
  await mainDb.end();
  if (process.env.POLYGON_DB_HOST) {
    await polygonDb.end();
  }
  console.log('🔌 DB 연결 종료');
}

// 프로세스 종료 시 연결 정리
process.on('SIGINT', closeConnections);
process.on('SIGTERM', closeConnections);

module.exports = {
  mainDb,
  polygonDb,
  testConnections,
  getTouristSpots,
  getTouristSpotDetail,
  getBuildingPolygons,
  closeConnections
};
