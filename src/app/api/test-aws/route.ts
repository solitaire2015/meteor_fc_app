import { NextResponse } from "next/server";
import { s3Client, AWS_CONFIG } from "@/lib/aws";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";

export async function GET() {
  try {
    // Test S3 connection by listing objects
    const command = new ListObjectsV2Command({
      Bucket: AWS_CONFIG.bucketName,
      MaxKeys: 1
    });
    
    const response = await s3Client.send(command);
    
    return NextResponse.json({
      success: true,
      message: "AWS S3 connection successful",
      config: {
        region: AWS_CONFIG.region,
        bucketName: AWS_CONFIG.bucketName,
        cloudFrontDomain: AWS_CONFIG.cloudFrontDomain
      },
      bucketExists: true,
      objectCount: response.KeyCount || 0
    });
    
  } catch (error: unknown) {
    console.error("AWS S3 connection error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown AWS error";
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      config: {
        region: AWS_CONFIG.region,
        bucketName: AWS_CONFIG.bucketName,
        cloudFrontDomain: AWS_CONFIG.cloudFrontDomain
      }
    }, { status: 500 });
  }
}