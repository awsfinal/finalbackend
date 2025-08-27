const { sequelize, User, Post, Comment, Like, TouristSpot } = require('../models/database');
const axios = require('axios');

class CommunityService {
  constructor() {
    this.sequelize = sequelize;
    this.User = User;
    this.Post = Post;
    this.Comment = Comment;
    this.Like = Like;
    this.TouristSpot = TouristSpot;
  }

  // ==================== 관광지 관련 메서드 ====================

  // 한국관광공사 API에서 가까운 관광지 조회
  async fetchNearbyTouristSpotsFromAPI(latitude, longitude, radius = 10000, limit = 10) {
    try {
      console.log(`🌐 한국관광공사 API 호출: ${latitude}, ${longitude}`);
      
      const apiKey = process.env.TOUR_API_KEY;
      if (!apiKey) {
        throw new Error('TOUR_API_KEY가 설정되지 않았습니다');
      }

      const url = 'http://apis.data.go.kr/B551011/KorService1/locationBasedList1';
      const params = {
        serviceKey: apiKey,
        numOfRows: limit,
        pageNo: 1,
        MobileOS: 'ETC',
        MobileApp: 'JjikGeo',
        _type: 'json',
        listYN: 'Y',
        arrange: 'E', // 거리순
        mapX: longitude,
        mapY: latitude,
        radius: radius,
        contentTypeId: 12 // 관광지
      };

      const response = await axios.get(url, { 
        params,
        timeout: 10000,
        headers: {
          'User-Agent': 'JjikGeo/1.0'
        }
      });

      if (response.data?.response?.body?.items?.item) {
        const items = Array.isArray(response.data.response.body.items.item) 
          ? response.data.response.body.items.item 
          : [response.data.response.body.items.item];
        
        console.log(`✅ API에서 ${items.length}개 관광지 조회 완료`);
        return items;
      }

      console.log('⚠️ API 응답에 데이터가 없습니다');
      return [];
    } catch (error) {
      console.error('❌ 한국관광공사 API 호출 오류:', error.message);
      return [];
    }
  }

  // RDS에서 가까운 관광지 조회 (카테고리별 필터링 포함)
  async getNearbyTouristSpotsByCategory(latitude, longitude, limit = 50, category = null) {
    try {
      console.log(`🔍 RDS에서 카테고리별 관광지 검색: ${latitude}, ${longitude}, category: ${category}`);
      
      // 카테고리 매핑 (프론트엔드 카테고리 → RDS spot_category)
      const categoryMapping = {
        'culturalHeritage': '문화재',
        'touristSpot': '관광지', 
        'experienceCenter': '문화시설'
      };
      
      let categoryFilter = '';
      let replacements = { 
        latitude: parseFloat(latitude), 
        longitude: parseFloat(longitude), 
        limit: parseInt(limit) 
      };
      
      // 카테고리 필터 추가
      if (category && categoryMapping[category]) {
        categoryFilter = 'AND spot_category = :category';
        replacements.category = categoryMapping[category];
        console.log(`📂 카테고리 필터 적용: ${category} → ${categoryMapping[category]}`);
      }
      
      const query = `
        SELECT 
          id,
          content_id,
          title,
          overview,
          address,
          latitude,
          longitude,
          image_url,
          tel,
          homepage,
          area_name,
          spot_category,
          area_code,
          unesco,
          use_time,
          rest_date,
          parking,
          info_center,
          (
            6371 * acos(
              cos(radians(:latitude)) * 
              cos(radians("latitude")) * 
              cos(radians("longitude") - radians(:longitude)) + 
              sin(radians(:latitude)) * 
              sin(radians("latitude"))
            )
          ) AS distance
        FROM "TouristSpots"
        WHERE "longitude" IS NOT NULL 
          AND "latitude" IS NOT NULL
          AND "content_id" IS NOT NULL
          ${categoryFilter}
          AND (
            6371 * acos(
              cos(radians(:latitude)) * 
              cos(radians("latitude")) * 
              cos(radians("longitude") - radians(:longitude)) + 
              sin(radians(:latitude)) * 
              sin(radians("latitude"))
            )
          ) <= 50
        ORDER BY distance
        LIMIT :limit
      `;

      const [results] = await sequelize.query(query, {
        replacements: replacements
      });

      if (results && results.length > 0) {
        console.log(`✅ RDS에서 ${category || '전체'} 카테고리 관광지 ${results.length}개 발견`);
        results.forEach((spot, index) => {
          console.log(`  ${index + 1}. ${spot.title} (${spot.spot_category}) - ${spot.distance?.toFixed(2)}km`);
        });
        return results;
      }

      console.log(`⚠️ RDS에서 ${category || '전체'} 카테고리 관광지를 찾지 못했습니다.`);
      return [];

    } catch (error) {
      console.error('❌ 카테고리별 관광지 조회 오류:', error);
      return [];
    }
  }

  // RDS에서 가까운 관광지 조회
  async getNearbyTouristSpots(latitude, longitude, limit = 3) {
    try {
      console.log(`🔍 RDS에서 가까운 관광지 검색: ${latitude}, ${longitude}`);
      
      const query = `
        SELECT 
          id,
          content_id,
          title,
          overview,
          address,
          latitude,
          longitude,
          image_url,
          tel,
          homepage,
          area_name,
          spot_category,
          area_code,
          unesco,
          (
            6371 * acos(
              cos(radians(:latitude)) * 
              cos(radians("latitude")) * 
              cos(radians("longitude") - radians(:longitude)) + 
              sin(radians(:latitude)) * 
              sin(radians("latitude"))
            )
          ) AS distance
        FROM "TouristSpots"
        WHERE "longitude" IS NOT NULL 
          AND "latitude" IS NOT NULL
          AND "content_id" IS NOT NULL
          AND (
            6371 * acos(
              cos(radians(:latitude)) * 
              cos(radians("latitude")) * 
              cos(radians("longitude") - radians(:longitude)) + 
              sin(radians(:latitude)) * 
              sin(radians("latitude"))
            )
          ) <= 20
        ORDER BY distance
        LIMIT :limit
      `;

      const [results] = await sequelize.query(query, {
        replacements: { 
          latitude: parseFloat(latitude), 
          longitude: parseFloat(longitude), 
          limit: parseInt(limit) 
        }
      });

      if (results && results.length > 0) {
        console.log(`✅ RDS에서 가까운 관광지 ${results.length}개 발견`);
        return results;
      }

      console.log('⚠️ RDS에서 가까운 관광지를 찾지 못했습니다. API 호출로 대체합니다.');
      const apiResults = await this.fetchNearbyTouristSpotsFromAPI(latitude, longitude, 20000, limit);
      return apiResults;

    } catch (error) {
      console.error('❌ 가까운 관광지 조회 오류:', error);
      
      try {
        console.log('🔄 API 호출로 대체 시도...');
        const apiResults = await this.fetchNearbyTouristSpotsFromAPI(latitude, longitude, 20000, limit);
        return apiResults;
      } catch (apiError) {
        console.error('❌ API 호출도 실패:', apiError.message);
        return [];
      }
    }
  }

  // ==================== 커뮤니티 관련 메서드 ====================

  // 게시글 목록 조회
  async getPosts(boardId, userId = null, sortBy = 'latest', page = 1, limit = 10) {
    try {
      console.log(`📋 게시글 목록 조회: boardId=${boardId}, sortBy=${sortBy}, page=${page}`);
      
      const offset = (page - 1) * limit;
      let orderBy = [['createdAt', 'DESC']]; // 기본: 최신순
      
      if (sortBy === 'popular') {
        orderBy = [['likes', 'DESC'], ['views', 'DESC']];
      } else if (sortBy === 'views') {
        orderBy = [['views', 'DESC']];
      }

      const posts = await Post.findAll({
        where: { boardId },
        order: orderBy,
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [
          {
            model: Comment,
            as: 'Comments',
            attributes: ['id']
          }
        ]
      });

      const formattedPosts = posts.map(post => ({
        id: post.id,
        title: post.title,
        content: post.content,
        author: post.author,
        authorId: post.authorId,
        authorLevel: post.authorLevel,
        boardId: post.boardId,
        category: post.category,
        views: post.views || 0,
        likes: post.likes || 0,
        commentCount: post.Comments ? post.Comments.length : 0,
        images: post.images,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt
      }));

      console.log(`✅ 게시글 ${formattedPosts.length}개 조회 완료`);
      return formattedPosts;
    } catch (error) {
      console.error('❌ 게시글 목록 조회 오류:', error);
      throw error;
    }
  }

  // 게시글 생성
  async createPost(postData) {
    try {
      console.log('📝 새 게시글 생성:', postData.title);
      
      const post = await Post.create({
        title: postData.title,
        content: postData.content,
        author: postData.author,
        authorId: postData.authorId,
        authorLevel: postData.authorLevel || 'Lv.1',
        boardId: postData.boardId,
        category: postData.category,
        images: postData.images || null,
        views: 0,
        likes: 0
      });

      console.log(`✅ 게시글 생성 완료: ID ${post.id}`);
      return post;
    } catch (error) {
      console.error('❌ 게시글 생성 오류:', error);
      throw error;
    }
  }

  // 댓글 목록 조회
  async getComments(postId) {
    try {
      console.log(`💬 댓글 목록 조회: postId=${postId}`);
      
      const comments = await Comment.findAll({
        where: { postId },
        order: [['createdAt', 'ASC']]
      });

      console.log(`✅ 댓글 ${comments.length}개 조회 완료`);
      return comments;
    } catch (error) {
      console.error('❌ 댓글 목록 조회 오류:', error);
      throw error;
    }
  }

  // 댓글 생성
  async createComment(commentData) {
    try {
      console.log('💬 새 댓글 생성:', commentData.content.substring(0, 50));
      
      const comment = await Comment.create({
        content: commentData.content,
        author: commentData.author,
        authorId: commentData.authorId,
        authorLevel: commentData.authorLevel || 'Lv.1',
        postId: commentData.postId,
        likes: 0
      });

      console.log(`✅ 댓글 생성 완료: ID ${comment.id}`);
      return comment;
    } catch (error) {
      console.error('❌ 댓글 생성 오류:', error);
      throw error;
    }
  }

  // 좋아요 토글
  async toggleLike(postId, userId) {
    try {
      console.log(`👍 좋아요 토글: postId=${postId}, userId=${userId}`);
      
      const existingLike = await Like.findOne({
        where: { postId, userId }
      });

      if (existingLike) {
        // 좋아요 취소
        await existingLike.destroy();
        await Post.decrement('likes', { where: { id: postId } });
        console.log('✅ 좋아요 취소 완료');
        return { liked: false };
      } else {
        // 좋아요 추가
        await Like.create({ postId, userId });
        await Post.increment('likes', { where: { id: postId } });
        console.log('✅ 좋아요 추가 완료');
        return { liked: true };
      }
    } catch (error) {
      console.error('❌ 좋아요 토글 오류:', error);
      throw error;
    }
  }

  // 관광지 상세 정보 조회
  async getTouristSpotDetail(contentId) {
    try {
      console.log(`🔍 관광지 상세 정보 조회: ${contentId}`);
      
      const spot = await this.TouristSpot.findOne({
        where: { content_id: contentId }
      });

      if (!spot) {
        console.log('❌ 관광지를 찾을 수 없습니다');
        return null;
      }

      console.log(`✅ 관광지 상세 정보 조회 완료: ${spot.title}`);
      return spot;
    } catch (error) {
      console.error('관광지 상세 정보 조회 오류:', error);
      throw error;
    }
  }
}

module.exports = new CommunityService();
