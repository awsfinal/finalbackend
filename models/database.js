const { Sequelize, DataTypes } = require('sequelize');

// 환경변수 로드 확인
console.log('🔍 데이터베이스 연결 설정:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);

// RDS PostgreSQL 연결 설정
const sequelize = new Sequelize(
  process.env.DB_NAME || 'jjikgeo',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'final-db.cz420qs4q66k.ap-northeast-1.rds.amazonaws.com',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 20,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  }
);

// 사용자 모델
const User = sequelize.define('User', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  level: {
    type: DataTypes.STRING,
    defaultValue: 'Lv.1'
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 게시글 모델
const Post = sequelize.define('Post', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  author: {
    type: DataTypes.STRING,
    allowNull: false
  },
  authorId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  authorLevel: {
    type: DataTypes.STRING,
    allowNull: false
  },
  boardId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: '일반'
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  likes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'Posts',
  timestamps: true
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
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  author: {
    type: DataTypes.STRING,
    allowNull: false
  },
  authorId: {
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
  }
}, {
  tableName: 'Comments',
  timestamps: true
});

// 좋아요 모델
const Like = sequelize.define('Like', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  postId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Post,
      key: 'id'
    }
  }
}, {
  tableName: 'Likes',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'postId']
    }
  ]
});

// 관광지 정보 모델 (실제 RDS 테이블과 연동)
const TouristSpot = sequelize.define('TouristSpot', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  content_id: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  address: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  longitude: {
    type: DataTypes.DECIMAL(12, 8),
    allowNull: true
  },
  latitude: {
    type: DataTypes.DECIMAL(12, 8),
    allowNull: true
  },
  image_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  area_code: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  area_name: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  spot_category: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  tel: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  zipcode: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  homepage: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  info_center: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  rest_date: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  use_time: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  parking: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  facilities: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  overview: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  unesco: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  }
}, {
  tableName: 'TouristSpots',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false, // updated_at 컬럼 없음
  indexes: [
    {
      name: 'idx_content_id',
      fields: ['content_id']
    },
    {
      name: 'idx_location',
      fields: ['longitude', 'latitude']
    },
    {
      name: 'idx_area',
      fields: ['area_code']
    }
  ]
});

// 관계 설정
Post.hasMany(Comment, { foreignKey: 'postId', as: 'Comments' });
Comment.belongsTo(Post, { foreignKey: 'postId', as: 'post' });

User.hasMany(Post, { foreignKey: 'authorId', sourceKey: 'id', as: 'posts' });
Post.belongsTo(User, { foreignKey: 'authorId', targetKey: 'id', as: 'user' });

User.hasMany(Comment, { foreignKey: 'authorId', sourceKey: 'id', as: 'comments' });
Comment.belongsTo(User, { foreignKey: 'authorId', targetKey: 'id', as: 'user' });

Post.hasMany(Like, { foreignKey: 'postId', as: 'postLikes' });
Comment.hasMany(Like, { foreignKey: 'commentId', as: 'commentLikes' });

// 데이터베이스 연결 테스트
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL RDS 연결 성공');
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL RDS 연결 실패:', error.message);
    return false;
  }
}

// 테이블 동기화 (개발 환경에서만)
async function syncDatabase() {
  if (process.env.NODE_ENV === 'development') {
    try {
      await sequelize.sync({ alter: true });
      console.log('✅ 데이터베이스 테이블 동기화 완료');
    } catch (error) {
      console.error('❌ 데이터베이스 동기화 실패:', error.message);
    }
  }
}

// RDS에서 가까운 관광지 조회
async function getTouristSpots(latitude, longitude, limit = 10) {
  try {
    const query = `
      SELECT 
        id, content_id, title, address, longitude, latitude,
        image_url, area_code, area_name, spot_category, tel,
        zipcode, homepage, info_center, rest_date, use_time,
        parking, facilities, overview,
        created_at,
        ST_Distance(
          ST_Point(longitude, latitude)::geography,
          ST_Point($1, $2)::geography
        ) as distance
        
      FROM "TouristSpots"

      WHERE ST_DWithin(
        ST_Point(longitude, latitude)::geography,
        ST_Point($1, $2)::geography,
        10000
      )
      ORDER BY distance
      LIMIT $3
    `;
    
    const result = await sequelize.query(query, {
      bind: [longitude, latitude, limit],
      type: sequelize.QueryTypes.SELECT
    });
    
    return result;
  } catch (error) {
    console.error('❌ RDS 관광지 조회 오류:', error);
    throw error;
  }
}

// 관광지 상세 정보 조회
async function getTouristSpotDetail(contentId) {
  try {
    const spot = await TouristSpot.findOne({
      where: { content_id: contentId }
    });
    return spot;
  } catch (error) {
    console.error('❌ RDS 관광지 상세 조회 오류:', error);
    throw error;
  }
}

module.exports = {
  sequelize,
  User,
  Post,
  Comment,
  Like,
  TouristSpot,
  testConnection,
  syncDatabase,
  getTouristSpots,
  getTouristSpotDetail
};
