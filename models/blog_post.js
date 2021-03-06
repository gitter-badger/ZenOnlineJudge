/*
 *  Package  : models
 *  Filename : blog_post.js
 *  Create   : 2018-02-05
 */
'use strict';

let Sequelize = require('sequelize');
let db = zoj.db;

let User = zoj.model('user');

let model = db.define('blog_post',
	{
		id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },

		user_id: { type: Sequelize.INTEGER },
		// The id of the user who whote this post
		from: { type: Sequelize.STRING(50) },
		// The source of the problem
		problem_id: { type: Sequelize.STRING(50) },
		// The id of the problem

		title: { type: Sequelize.STRING(80) },
		content: { type: Sequelize.TEXT },
		is_public: { type: Sequelize.BOOLEAN },
		time: { type: Sequelize.INTEGER }
	}, {
		timestamps: false,
		tableName: 'blog_post',
		indexes: [
			{ fields: ['user_id'], }
		]
	}
);

let Model = require('./common');
class BlogPost extends Model {
	static async create(val) {
		return await BlogPost.fromRecord(BlogPost.model.build(Object.assign({
			user_id: '',
			from: '',
			problem_id: '',
			title: '',
			content: '',
			is_public: false,
			time: 0
		}, val)));
	}

	async loadRelationships() {
		this.user = await User.fromID(this.user_id);
	}

	async isAllowedEditBy(user) {
		if (!user) return false;
		if (this.user_id === user.id) return true;
		return await user.haveAccess('blog_edit');
		// 1.The user is teacher/system admin
		// 2.The user is the owner of this post
	}

	async isAllowedSeeBy(user) {
		if (!user) return false;
		if (await this.is_public) return true;
		if (this.user_id === user.id) return true;
		return user.haveAccess('others_blogs');
		// 1.The post is public and the user is indoor student
		// 2.The user is teacher/system admin
		// 3.The user is the owner of this post
	}

	async getTags() {
		let blogPostTagMap = zoj.model('blog_post_tag_map');
		let maps = await blogPostTagMap.query(null, {
			post_id: this.id
		});

		let blogPostTag = zoj.model('blog_post_tag');
		let res = await maps.mapAsync(async map => await blogPostTag.fromID(map.tag_id));

		res.sort((a, b) => {
			return a.color > b.color ? 1 : -1;
		});

		return res;
	}

	async setTags(newTagIDs) {
		let blogPostTagMap = zoj.model('blog_post_tag_map');

		let oldTagIDs = (await this.getTags()).map(x => x.id);

		let delTagIDs = oldTagIDs.filter(x => !newTagIDs.includes(x));
		let addTagIDs = newTagIDs.filter(x => !oldTagIDs.includes(x));

		for (let tagID of delTagIDs) {
			let map = await blogPostTagMap.findOne({
				where: {
					post_id: this.id,
					tag_id: tagID
				}
			});

			await map.destroy();
		}

		for (let tagID of addTagIDs) {
			let map = await blogPostTagMap.create({
				post_id: this.id,
				tag_id: tagID
			});

			await map.save();
		}
	}

	async delete() {
		await db.query('DELETE FROM `blog_post`         WHERE `id`      = ' + this.id);
		await db.query('DELETE FROM `blog_post_tag_map` WHERE `post_id` = ' + this.id);
	}

	getModel() { return model; }
}

BlogPost.model = model;

module.exports = BlogPost;