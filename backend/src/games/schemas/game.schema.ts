import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type GameDocument = HydratedDocument<Game>;

@Schema({
  timestamps: true,
  collection: 'games',
  toJSON: {
    virtuals: false,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
      delete ret._id;
      return ret;
    },
  },
  toObject: {
    virtuals: false,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
      delete ret._id;
      return ret;
    },
  },
})
export class Game {
  @Prop({ type: Number, required: true, unique: true, index: true })
  id: number;

  @Prop({ type: String, required: true, maxlength: 200, trim: true })
  title: string;

  @Prop({ type: String, required: true, unique: true, maxlength: 220, trim: true })
  slug: string;

  @Prop({ type: String, default: null })
  synopsis: string | null;

  @Prop({ type: String, maxlength: 10, default: 'E' })
  esrbRating: string;

  @Prop({ type: String, required: true })
  releaseDate: string;

  @Prop({ type: String, maxlength: 255, default: null })
  coverImageUrl: string | null;

  @Prop({ type: String, maxlength: 120, default: null })
  discountCampaignName: string | null;

  @Prop({ type: Number, default: 0 })
  discountPercentage: number;

  @Prop({ type: Date, default: null })
  discountStartDate: Date | null;

  @Prop({ type: Date, default: null })
  discountEndDate: Date | null;

  @Prop({ type: Number, required: true, index: true })
  publisherId: number;

  @Prop({ type: Number, required: true, index: true })
  developerId: number;

  @Prop({ type: [Number], default: [], index: true })
  genreIds: number[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const GameSchema = SchemaFactory.createForClass(Game);
