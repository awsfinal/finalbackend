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
  likes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: 'general'
  },
  image_url: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'posts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 댓글 모델
const Comment = sequelize.define('Comment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  post_id: {
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
  likes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'comments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 좋아요 모델
const Like = sequelize.define('Like', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  post_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Post,
      key: 'id'
    }
  },
  comment_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Comment,
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('post', 'comment'),
    allowNull: false
  }
}, {
  tableName: 'likes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'post_id', 'comment_id', 'type']
    }
  ]
});

// 관광지 정보 모델 (기존 RDS 테이블과 연동)
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
  heritage_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  fee_type: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  usage_fee: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'simple_tourist_spots',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false, // updated_at 컬럼 없음
  indexes: [
    {
      name: 'idx_simple_content_id',
      fields: ['content_id']
    },
    {
      name: 'idx_simple_location',
      fields: ['longitude', 'latitude']
    },
    {
      name: 'idx_simple_area',
      fields: ['area_code']
    }
  ]
});

// 관계 설정
Post.hasMany(Comment, { foreignKey: 'post_id', as: 'comments' });
Comment.belongsTo(Post, { foreignKey: 'post_id', as: 'post' });

User.hasMany(Post, { foreignKey: 'author', sourceKey: 'id', as: 'posts' });
Post.belongsTo(User, { foreignKey: 'author', targetKey: 'id', as: 'user' });

User.hasMany(Comment, { foreignKey: 'author', sourceKey: 'id', as: 'comments' });
Comment.belongsTo(User, { foreignKey: 'author', targetKey: 'id', as: 'user' });

Post.hasMany(Like, { foreignKey: 'post_id', as: 'postLikes' });
Comment.hasMany(Like, { foreignKey: 'comment_id', as: 'commentLikes' });

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
        parking, facilities, overview, heritage_type, fee_type, usage_fee,
        created_at,
        ST_Distance(
          ST_Point(longitude, latitude)::geography,
          ST_Point($1, $2)::geography
        ) as distance
      FROM simple_tourist_spots
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
