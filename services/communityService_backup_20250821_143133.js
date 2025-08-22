const { User, Post, Comment, TouristSpot, sequelize } = require('../models/database');
const { Op } = require('sequelize');
const axios = require('axios');

class CommunityService {
  // 사용자 생성 또는 조회
  async getOrCreateUser(userId) {
    try {
      let user = await User.findByPk(userId);

      if (!user) {
        user = await User.create({
          id: userId,
          name: '사용자' + userId.slice(-4),
          level: 'Lv.' + Math.floor(Math.random() * 20 + 1)
        });
        console.log('새 사용자 생성:', user.toJSON());
      }

      return user;
    } catch (error) {
      console.error('사용자 생성/조회 오류:', error);
      throw error;
    }
  }

  // 게시글 작성
  async createPost(postData) {
    try {
      const { boardId, userId, title, content, category, author, authorLevel, images } = postData;

      // 사용자 확인/생성
      await this.getOrCreateUser(userId);

      const post = await Post.create({
        boardId,
        title,
        content,
        category: category || '일반',
        authorId: userId,
        author,
        authorLevel,
        images: images || [],
        likes: 0,
        views: 0,
        likedBy: []
      });

      console.log('게시글 생성 완료:', post.toJSON());
      return post;
    } catch (error) {
      console.error('게시글 작성 오류:', error);
      throw error;
    }
  }

  // 게시글 목록 조회
  async getPosts(boardId, userId, sort = 'latest') {
    try {
      let whereClause = {};
      let orderClause = [];

      // 게시판별 필터링
      if (boardId === 'my-posts') {
        whereClause.authorId = userId;
      } else if (boardId === 'commented-posts') {
        // 댓글을 단 게시글 조회
        const commentedPostIds = await Comment.findAll({
          where: { authorId: userId },
          attributes: ['postId'],
          group: ['postId']
        });

        const postIds = commentedPostIds.map(comment => comment.postId);
        if (postIds.length === 0) {
          return [];
        }

        whereClause.id = { [Op.in]: postIds };
      } else {
        whereClause.boardId = boardId;
      }

      // 정렬 설정
      switch (sort) {
        case 'latest':
          orderClause = [['createdAt', 'DESC']];
          break;
        case 'popular':
          orderClause = [['likes', 'DESC']];
          break;
        case 'comments':
          orderClause = [
            [sequelize.literal('(SELECT COUNT(*) FROM comments WHERE comments.postId = Post.id)'), 'DESC']
          ];
          break;
        case 'views':
          orderClause = [['views', 'DESC']];
          break;
        default:
          orderClause = [['createdAt', 'DESC']];
      }

      const posts = await Post.findAll({
        where: whereClause,
        order: orderClause,
        include: [
          {
            model: Comment,
            as: 'comments',
            attributes: ['id', 'content', 'author', 'authorLevel', 'authorId', 'likes', 'createdAt']
          }
        ],
        limit: 50 // 최대 50개 게시글
      });

      console.log(`게시글 조회 완료: ${boardId}, ${posts.length}개`);
      return posts;
    } catch (error) {
      console.error('게시글 목록 조회 오류:', error);
      throw error;
    }
  }

  // 특정 게시글 조회
  async getPostById(postId) {
    try {
      const post = await Post.findByPk(postId, {
        include: [
          {
            model: Comment,
            as: 'comments',
            attributes: ['id', 'content', 'author', 'authorLevel', 'authorId', 'likes', 'createdAt'],
            order: [['createdAt', 'ASC']]
          }
        ]
      });

      if (post) {
        // 조회수 증가
        await post.increment('views');
        console.log(`게시글 조회: ${postId}, 조회수: ${post.views + 1}`);
      }

      return post;
    } catch (error) {
      console.error('게시글 조회 오류:', error);
      throw error;
    }
  }

  // 댓글 작성
  async createComment(commentData) {
    try {
      const { postId, userId, content, author, authorLevel } = commentData;

      // 사용자 확인/생성
      await this.getOrCreateUser(userId);

      // 게시글 존재 확인
      const post = await Post.findByPk(postId);
      if (!post) {
        throw new Error('게시글을 찾을 수 없습니다.');
      }

      const comment = await Comment.create({
        postId,
        content,
        authorId: userId,
        author,
        authorLevel,
        likes: 0
      });

      console.log('댓글 생성 완료:', comment.toJSON());
      return comment;
    } catch (error) {
      console.error('댓글 작성 오류:', error);
      throw error;
    }
  }

  // 좋아요 토글
  async toggleLike(postId, userId) {
    try {
      const post = await Post.findByPk(postId);
      if (!post) {
        throw new Error('게시글을 찾을 수 없습니다.');
      }

      let likedBy = post.likedBy || [];
      const likedIndex = likedBy.indexOf(userId);

      if (likedIndex > -1) {
        // 좋아요 취소
        likedBy.splice(likedIndex, 1);
        await post.decrement('likes');
      } else {
        // 좋아요 추가
        likedBy.push(userId);
        await post.increment('likes');
      }

      await post.update({ likedBy });
      await post.reload();

      console.log(`좋아요 토글: ${postId}, 현재 좋아요: ${post.likes}`);
      return post.likes;
    } catch (error) {
      console.error('좋아요 처리 오류:', error);
      throw error;
    }
  }

  // 게시판별 게시글 수 조회
  async getPostCount(boardId, userId) {
    try {
      let whereClause = {};

      if (boardId === 'my-posts') {
        whereClause.authorId = userId;
      } else if (boardId === 'commented-posts') {
        const commentedPostIds = await Comment.findAll({
          where: { authorId: userId },
          attributes: ['postId'],
          group: ['postId']
        });

        const postIds = commentedPostIds.map(comment => comment.postId);
        if (postIds.length === 0) {
          return 0;
        }

        whereClause.id = { [Op.in]: postIds };
      } else {
        whereClause.boardId = boardId;
      }

      const count = await Post.count({ where: whereClause });
      console.log(`게시판 통계: ${boardId}, ${count}개`);
      return count;
    } catch (error) {
      console.error('게시판 통계 조회 오류:', error);
      return 0;
    }
  }

  // 전체 통계 조회
  async getStats() {
    try {
      const totalPosts = await Post.count();
      const totalUsers = await User.count();
      const totalComments = await Comment.count();

      const postsByBoard = await Post.findAll({
        attributes: [
          'boardId',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['boardId']
      });

      const stats = {
        totalPosts,
        totalUsers,
        totalComments,
        postsByBoard: postsByBoard.reduce((acc, item) => {
          acc[item.boardId] = parseInt(item.dataValues.count);
          return acc;
        }, {})
      };

      console.log('전체 통계:', stats);
      return stats;
    } catch (error) {
      console.error('통계 조회 오류:', error);
      throw error;
    }
  }

  // 한국관광공사 API - 서울 관광지 데이터 가져오기
  async fetchSeoulTouristSpots() {
    try {
      const apiKey = process.env.TOUR_API_KEY;
      if (!apiKey) {
        throw new Error('관광공사 API 키가 설정되지 않았습니다.');
      }

      console.log('🏛️ 서울 관광지 데이터 가져오기 시작...');

      const baseUrl = 'https://apis.data.go.kr/B551011/KorService1/areaBasedList1';
      const params = {
        serviceKey: apiKey,
        numOfRows: 100,
        pageNo: 1,
        MobileOS: 'ETC',
        MobileApp: 'JjikJio',
        _type: 'json',
        listYN: 'Y',
        arrange: 'A',
        contentTypeId: 12, // 관광지
        areaCode: 1, // 서울
        cat1: 'A01' // 자연
      };

      const response = await axios.get(baseUrl, { params });
      
      if (response.data.response.header.resultCode === '0000') {
        const items = response.data.response.body.items.item || [];
        console.log(`✅ 관광공사 API 응답: ${items.length}개 관광지`);
        return items;
      } else {
        throw new Error(`API 오류: ${response.data.response.header.resultMsg}`);
      }
    } catch (error) {
      console.error('❌ 관광공사 API 호출 오류:', error.message);
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

  // GPS 기반 가까운 관광지 조회 (3개)
  async getNearbyTouristSpots(latitude, longitude, limit = 3) {
    try {
      console.log(`🔍 가까운 관광지 검색: ${latitude}, ${longitude}`);

      // Haversine 공식을 사용한 거리 계산 SQL
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

      console.log(`✅ 가까운 관광지 ${nearbySpots.length}개 발견`);
      return nearbySpots;
    } catch (error) {
      console.error('❌ 가까운 관광지 조회 오류:', error);
      return [];
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
}

module.exports = new CommunityService();