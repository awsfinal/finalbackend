const { Sequelize, DataTypes } = require('sequelize');
const axios = require('axios');

// MySQL 연결 설정
const sequelize = new Sequelize(
  process.env.DB_NAME || 'community_db',
  process.env.DB_USER || 'appuser',
  process.env.DB_PASSWORD || 'apppass123',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: console.log,
    timezone: '+09:00'
  }
);

// 사용자 모델
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  level: {
    type: DataTypes.STRING,
    defaultValue: 'Lv.1'
  }
});

// 게시글 모델
const Post = sequelize.define('Post', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  boardId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: '일반'
  },
  authorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  author: {
    type: DataTypes.STRING,
    allowNull: false
  },
  authorLevel: {
    type: DataTypes.STRING,
    allowNull: false
  },
  likes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true
  }
});

// 댓글 모델
const Comment = sequelize.define('Comment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  postId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Post,
      key: 'id'
    }
  },
  authorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  author: {
    type: DataTypes.STRING,
    allowNull: false
  },
  authorLevel: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  }
});

// 좋아요 모델
const Like = sequelize.define('Like', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  postId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Post,
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  }
});

// 관광지 모델
const TouristSpot = sequelize.define('TouristSpot', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  contentId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  addr1: {
    type: DataTypes.STRING,
    allowNull: true
  },
  addr2: {
    type: DataTypes.STRING,
    allowNull: true
  },
  areaCode: {
    type: DataTypes.STRING,
    allowNull: true,
    index: true
  },
  cat1: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cat2: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cat3: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contentTypeId: {
    type: DataTypes.STRING,
    allowNull: true,
    index: true
  },
  firstImage: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  firstImage2: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  mapX: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
    index: true
  },
  mapY: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true
  },
  tel: {
    type: DataTypes.STRING,
    allowNull: true
  },
  zipcode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  overview: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  modifiedTime: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

// 관계 설정
Post.belongsTo(User, { foreignKey: 'authorId', onDelete: 'CASCADE' });
Comment.belongsTo(Post, { foreignKey: 'postId', onDelete: 'CASCADE' });
Comment.belongsTo(User, { foreignKey: 'authorId', onDelete: 'CASCADE' });
Like.belongsTo(Post, { foreignKey: 'postId', onDelete: 'CASCADE' });
Like.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });

class CommunityService {
  constructor() {
    this.sequelize = sequelize;
    this.User = User;
    this.Post = Post;
    this.Comment = Comment;
    this.Like = Like;
    this.TouristSpot = TouristSpot;
  }

  // 한국관광공사 위치기반 API - 가까운 관광지 조회
  async fetchNearbyTouristSpotsFromAPI(latitude, longitude, radius = 10000, limit = 10) {
    try {
      // 제공받은 인증키 사용
      const apiKey = 'jXbeQ98Dvep6SzEFu8ulcLjvOeUWdY107O4fsq9SUJ0PQkDsUPXrm8gmZ8hKCnSSEEF6iM4Le8oMeyhqLrD3MQ==';
      
      console.log(`🏛️ 위치기반 관광지 조회: ${latitude}, ${longitude} (반경: ${radius}m)`);

      const baseUrl = 'https://apis.data.go.kr/B551011/KorService2/locationBasedList2';
      const params = {
        serviceKey: apiKey,
        numOfRows: limit.toString(),
        pageNo: '1',
        MobileOS: 'ETC',
        MobileApp: 'JjikJio',
        _type: 'json',
        arrange: 'E', // 거리순 정렬
        mapX: longitude.toString(),
        mapY: latitude.toString(),
        radius: radius.toString(),
        contentTypeId: '12', // 관광지
        areaCode: '1' // 서울
      };

      const response = await axios.get(baseUrl, { params });
      
      if (response.data && response.data.response) {
        const header = response.data.response.header;
        const body = response.data.response.body;
        
        if (header && header.resultCode === '0000') {
          const items = body && body.items ? body.items.item : [];
          const itemsArray = Array.isArray(items) ? items : [items];
          
          console.log(`✅ 관광공사 API 응답: ${itemsArray.length}개 관광지`);
          return itemsArray;
        } else {
          const errorMsg = header ? header.resultMsg : '알 수 없는 오류';
          throw new Error(`API 오류: ${errorMsg}`);
        }
      } else {
        throw new Error('API 응답 구조가 예상과 다릅니다.');
      }
    } catch (error) {
      console.error('❌ 관광공사 위치기반 API 호출 오류:', error.message);
      if (error.response) {
        console.error('❌ API 응답 오류:', error.response.status, error.response.data);
      }
      throw error;
    }
  }

  // 한국관광공사 API - 서울 관광지 데이터 가져오기 (지역기반)
  async fetchSeoulTouristSpots() {
    try {
      // 제공받은 인증키 사용
      const apiKey = 'jXbeQ98Dvep6SzEFu8ulcLjvOeUWdY107O4fsq9SUJ0PQkDsUPXrm8gmZ8hKCnSSEEF6iM4Le8oMeyhqLrD3MQ==';
      
      console.log('🏛️ 서울 관광지 데이터 가져오기 시작...');

      const baseUrl = 'https://apis.data.go.kr/B551011/KorService2/areaBasedList2';
      const params = {
        serviceKey: apiKey,
        numOfRows: '100',
        pageNo: '1',
        MobileOS: 'ETC',
        MobileApp: 'JjikJio',
        _type: 'json',
        listYN: 'Y',
        arrange: 'A', // 제목순
        contentTypeId: '12', // 관광지
        areaCode: '1' // 서울
      };

      console.log('📡 API 호출 URL:', baseUrl);
      console.log('📡 API 파라미터:', params);

      const response = await axios.get(baseUrl, { params });
      
      console.log('📡 API 응답 상태:', response.status);
      
      if (response.data && response.data.response) {
        const header = response.data.response.header;
        const body = response.data.response.body;
        
        if (header && header.resultCode === '0000') {
          const items = body && body.items ? body.items.item : [];
          const itemsArray = Array.isArray(items) ? items : [items];
          
          console.log(`✅ 관광공사 API 응답: ${itemsArray.length}개 관광지`);
          return itemsArray;
        } else {
          const errorMsg = header ? header.resultMsg : '알 수 없는 오류';
          throw new Error(`API 오류: ${errorMsg}`);
        }
      } else {
        console.error('❌ 예상과 다른 API 응답 구조:', response.data);
        throw new Error('API 응답 구조가 예상과 다릅니다.');
      }
    } catch (error) {
      console.error('❌ 관광공사 API 호출 오류:', error.message);
      if (error.response) {
        console.error('❌ API 응답 오류:', error.response.status, error.response.data);
      }
      throw error;
    }
  }

  // 서울 관광지 데이터를 MySQL에 저장
  async saveSeoulTouristSpots() {
    try {
      console.log('💾 서울 관광지 데이터 저장 시작...');
      
      const touristSpots = await this.fetchSeoulTouristSpots();
      let savedCount = 0;
      let updatedCount = 0;

      for (const spot of touristSpots) {
        try {
          const [touristSpot, created] = await TouristSpot.upsert({
            contentId: spot.contentid,
            title: spot.title,
            addr1: spot.addr1,
            addr2: spot.addr2,
            areaCode: spot.areacode,
            cat1: spot.cat1,
            cat2: spot.cat2,
            cat3: spot.cat3,
            contentTypeId: spot.contenttypeid,
            firstImage: spot.firstimage,
            firstImage2: spot.firstimage2,
            mapX: spot.mapx ? parseFloat(spot.mapx) : null,
            mapY: spot.mapy ? parseFloat(spot.mapy) : null,
            tel: spot.tel,
            zipcode: spot.zipcode,
            modifiedTime: spot.modifiedtime
          });

          if (created) {
            savedCount++;
          } else {
            updatedCount++;
          }
        } catch (itemError) {
          console.error(`관광지 저장 오류 (${spot.title}):`, itemError.message);
        }
      }

      console.log(`✅ 서울 관광지 저장 완료: 신규 ${savedCount}개, 업데이트 ${updatedCount}개`);
      return { saved: savedCount, updated: updatedCount, total: touristSpots.length };
    } catch (error) {
      console.error('❌ 서울 관광지 저장 오류:', error);
      throw error;
    }
  }

  // GPS 기반 가까운 관광지 조회 (메인페이지용 - API 직접 호출)
  async getNearbyTouristSpots(latitude, longitude, limit = 3) {
    try {
      console.log(`🔍 가까운 관광지 검색: ${latitude}, ${longitude}`);

      // 먼저 API에서 직접 가져오기
      const apiSpots = await this.fetchNearbyTouristSpotsFromAPI(latitude, longitude, 10000, limit);
      
      // API 데이터를 메인페이지 형식에 맞게 변환
      const formattedSpots = apiSpots.map(spot => ({
        contentId: spot.contentid,
        title: spot.title,
        addr1: spot.addr1,
        addr2: spot.addr2,
        areaCode: spot.areacode,
        cat1: spot.cat1,
        cat2: spot.cat2,
        cat3: spot.cat3,
        contentTypeId: spot.contenttypeid,
        firstImage: spot.firstimage,
        firstImage2: spot.firstimage2,
        mapX: parseFloat(spot.mapx),
        mapY: parseFloat(spot.mapy),
        tel: spot.tel,
        zipcode: spot.zipcode,
        distance: parseFloat(spot.dist) / 1000, // 미터를 킬로미터로 변환
        modifiedTime: spot.modifiedtime
      }));

      console.log(`✅ 가까운 관광지 ${formattedSpots.length}개 발견`);
      return formattedSpots;
    } catch (error) {
      console.error('❌ 가까운 관광지 조회 오류:', error);
      
      // API 실패 시 DB에서 조회 (fallback)
      try {
        console.log('🔄 DB에서 가까운 관광지 조회 시도...');
        const query = `
          SELECT *,
          (6371 * acos(cos(radians(:latitude)) * cos(radians(mapY)) * 
          cos(radians(mapX) - radians(:longitude)) + sin(radians(:latitude)) * 
          sin(radians(mapY)))) AS distance
          FROM tourist_spots
          WHERE mapX IS NOT NULL AND mapY IS NOT NULL
          HAVING distance <= 20
          ORDER BY distance ASC
          LIMIT :limit
        `;

        const nearbySpots = await sequelize.query(query, {
          replacements: { latitude, longitude, limit },
          type: sequelize.QueryTypes.SELECT
        });

        console.log(`✅ DB에서 가까운 관광지 ${nearbySpots.length}개 발견`);
        return nearbySpots;
      } catch (dbError) {
        console.error('❌ DB 조회도 실패:', dbError);
        return [];
      }
    }
  }

  // 관광지 총 개수 조회
  async getTouristSpotCount() {
    try {
      const count = await TouristSpot.count();
      console.log(`📊 저장된 관광지 총 개수: ${count}개`);
      return count;
    } catch (error) {
      console.error('관광지 개수 조회 오류:', error);
      return 0;
    }
  }

  // 기존 커뮤니티 관련 메서드들은 그대로 유지...
  // (여기서는 생략하고 필요시 추가)
}

module.exports = new CommunityService();
